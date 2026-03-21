import { LogResult, WebhookDispatchMode } from "@prisma/client";
import { db } from "@/lib/db";
import type { AsyncWebhookSignaturePayload } from "@/lib/affiliate/callback-signature";
import { createAffiliateAsyncWebhookSignature } from "@/lib/affiliate/callback-signature";
import type { AffiliateReturnStatus } from "@/lib/affiliate/status";
import { resolveAffiliateReturnStatus } from "@/lib/affiliate/status";
import { writeRedirectLog } from "@/lib/logging/events";
import { decryptValue } from "@/lib/security/encryption";

const ASYNC_WEBHOOK_EVENT = "order.status_changed";
const RESPONSE_BODY_LIMIT = 2000;

type AsyncWebhookBody = {
  event: string;
  affiliateCode: string;
  orderId: string;
  externalOrderId: string;
  status: AffiliateReturnStatus;
  amount: number;
  currency: string;
  ts: string;
  landingDomain: string;
  buyer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    country: string;
    state: string;
    city: string;
    address1: string;
    address2: string | null;
    postalCode: string;
  };
  items: Array<{
    productId: string | null;
    productName: string;
    quantity: number;
    unitPrice: number;
  }>;
  sig?: string;
};

export type DeliverAffiliateAsyncWebhooksResult =
  | {
      ok: true;
      mode: WebhookDispatchMode;
      orderId: string;
      callbackStatus: AffiliateReturnStatus;
      endpointCount: number;
      deliveredCount: number;
      successCount: number;
      skippedCount: number;
      signedCount: number;
    }
  | {
      ok: false;
      mode: WebhookDispatchMode;
      message: string;
      orderId?: string;
      callbackStatus?: AffiliateReturnStatus;
      endpointCount?: number;
    };

function trimResponseBody(value: string | null) {
  if (!value) {
    return null;
  }

  return value.length > RESPONSE_BODY_LIMIT ? value.slice(0, RESPONSE_BODY_LIMIT) : value;
}

function buildSignaturePayload(body: Omit<AsyncWebhookBody, "buyer" | "items" | "sig" | "landingDomain">): AsyncWebhookSignaturePayload {
  return {
    event: body.event,
    affiliateCode: body.affiliateCode,
    orderId: body.orderId,
    externalOrderId: body.externalOrderId,
    status: body.status,
    amount: body.amount.toFixed(2),
    currency: body.currency,
    ts: body.ts,
  };
}

export async function deliverAffiliateAsyncWebhooks(
  orderId: string,
  mode: WebhookDispatchMode = WebhookDispatchMode.AUTO,
): Promise<DeliverAffiliateAsyncWebhooksResult> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      affiliate: {
        include: {
          webhookEndpoints: {
            where: { isActive: true },
            orderBy: { createdAt: "asc" },
          },
        },
      },
      landingDomain: true,
      items: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!order) {
    return {
      ok: false,
      mode,
      message: "订单不存在。",
    };
  }

  const callbackStatus = resolveAffiliateReturnStatus(order.status);

  if (!callbackStatus) {
    return {
      ok: false,
      mode,
      orderId: order.id,
      message: "只有终态订单才会触发异步通知。",
    };
  }

  const endpoints = order.affiliate.webhookEndpoints;

  if (endpoints.length === 0) {
    await writeRedirectLog({
      orderId: order.id,
      landingDomainId: order.landingDomainId,
      eventType: `affiliate.async_webhook.${mode.toLowerCase()}_skipped`,
      result: LogResult.INFO,
      status: callbackStatus,
      message: "当前分销商没有启用的异步通知地址。",
      metadata: {
        affiliateCode: order.affiliate.code,
        dispatchMode: mode,
      },
    });

    return {
      ok: false,
      mode,
      orderId: order.id,
      callbackStatus,
      endpointCount: 0,
      message: "当前分销商没有启用的异步通知地址。",
    };
  }

  let deliveredCount = 0;
  let successCount = 0;
  let skippedCount = 0;
  let signedCount = 0;

  for (const endpoint of endpoints) {
    const existingDispatch = await db.affiliateWebhookDispatch.findUnique({
      where: {
        orderId_endpointId_callbackStatus_dispatchMode: {
          orderId: order.id,
          endpointId: endpoint.id,
          callbackStatus,
          dispatchMode: mode,
        },
      },
    });

    if (mode === WebhookDispatchMode.AUTO && existingDispatch?.success) {
      skippedCount += 1;
      continue;
    }

    const ts = Math.floor(Date.now() / 1000).toString();
    const baseBody = {
      event: ASYNC_WEBHOOK_EVENT,
      affiliateCode: order.affiliate.code,
      orderId: order.id,
      externalOrderId: order.externalOrderId,
      status: callbackStatus,
      amount: Number(order.totalAmount),
      currency: order.currency,
      ts,
    };

    const body: AsyncWebhookBody = {
      ...baseBody,
      landingDomain: order.landingDomain.hostname,
      buyer: {
        firstName: order.buyerFirstName,
        lastName: order.buyerLastName,
        email: order.buyerEmail,
        phone: order.buyerPhone,
        country: order.country,
        state: order.state,
        city: order.city,
        address1: order.address1,
        address2: order.address2,
        postalCode: order.postalCode,
      },
      items: order.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
      })),
    };

    let signature: string | null = null;

    if (order.affiliate.callbackSecretEncrypted) {
      signature = createAffiliateAsyncWebhookSignature(
        buildSignaturePayload(baseBody),
        decryptValue(order.affiliate.callbackSecretEncrypted),
      );
      body.sig = signature;
      signedCount += 1;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(endpoint.url, {
        method: "POST",
        redirect: "manual",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "shopa-affiliate-webhook/1.0",
          "X-Shopa-Event": ASYNC_WEBHOOK_EVENT,
          "X-Shopa-Timestamp": ts,
          ...(signature ? { "X-Shopa-Signature": signature } : {}),
        },
        body: JSON.stringify(body),
      });

      const responseText = trimResponseBody(await response.text());
      const success = response.status >= 200 && response.status < 300;

      await db.affiliateWebhookDispatch.upsert({
        where: {
          orderId_endpointId_callbackStatus_dispatchMode: {
            orderId: order.id,
            endpointId: endpoint.id,
            callbackStatus,
            dispatchMode: mode,
          },
        },
        update: {
          signed: Boolean(signature),
          success,
          responseStatus: response.status,
          requestUrl: endpoint.url,
          requestBody: body,
          responseBody: responseText,
          errorMessage: null,
        },
        create: {
          orderId: order.id,
          endpointId: endpoint.id,
          callbackStatus,
          dispatchMode: mode,
          signed: Boolean(signature),
          success,
          responseStatus: response.status,
          requestUrl: endpoint.url,
          requestBody: body,
          responseBody: responseText,
        },
      });

      deliveredCount += 1;
      if (success) {
        successCount += 1;
      }

      await writeRedirectLog({
        orderId: order.id,
        landingDomainId: order.landingDomainId,
        eventType: `affiliate.async_webhook.${mode.toLowerCase()}`,
        result: success ? LogResult.SUCCESS : LogResult.FAILURE,
        status: callbackStatus,
        requestUrl: endpoint.url,
        message: success
          ? `异步通知已送达，HTTP ${response.status}。`
          : `异步通知已发出，但对方返回 HTTP ${response.status}。`,
        metadata: {
          affiliateCode: order.affiliate.code,
          endpointId: endpoint.id,
          signed: Boolean(signature),
          dispatchMode: mode,
          httpStatus: response.status,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "异步通知请求失败。";

      await db.affiliateWebhookDispatch.upsert({
        where: {
          orderId_endpointId_callbackStatus_dispatchMode: {
            orderId: order.id,
            endpointId: endpoint.id,
            callbackStatus,
            dispatchMode: mode,
          },
        },
        update: {
          signed: Boolean(signature),
          success: false,
          responseStatus: null,
          requestUrl: endpoint.url,
          requestBody: body,
          responseBody: null,
          errorMessage: message,
        },
        create: {
          orderId: order.id,
          endpointId: endpoint.id,
          callbackStatus,
          dispatchMode: mode,
          signed: Boolean(signature),
          success: false,
          responseStatus: null,
          requestUrl: endpoint.url,
          requestBody: body,
          responseBody: null,
          errorMessage: message,
        },
      });

      deliveredCount += 1;

      await writeRedirectLog({
        orderId: order.id,
        landingDomainId: order.landingDomainId,
        eventType: `affiliate.async_webhook.${mode.toLowerCase()}`,
        result: LogResult.FAILURE,
        status: callbackStatus,
        requestUrl: endpoint.url,
        message,
        metadata: {
          affiliateCode: order.affiliate.code,
          endpointId: endpoint.id,
          signed: Boolean(signature),
          dispatchMode: mode,
        },
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    ok: true,
    mode,
    orderId: order.id,
    callbackStatus,
    endpointCount: endpoints.length,
    deliveredCount,
    successCount,
    skippedCount,
    signedCount,
  };
}
