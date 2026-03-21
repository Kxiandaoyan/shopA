import { LogResult, OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { writeRedirectLog } from "@/lib/logging/events";
import { decryptValue } from "@/lib/security/encryption";
import { buildReturnUrl } from "@/lib/stripe/urls";
import { createAffiliateCallbackSignature } from "@/lib/affiliate/callback-signature";

export type AffiliateReturnStatus = "paid" | "failed" | "expired" | "canceled";

type DeliveryPlan = {
  orderId: string;
  landingDomainId: string;
  affiliateCode: string;
  callbackStatus: AffiliateReturnStatus;
  requestUrl: string;
  logRequestUrl: string;
  signed: boolean;
};

export type DeliverAffiliateReturnCallbackResult =
  | {
      ok: true;
      message: string;
      orderId: string;
      landingDomainId: string;
      callbackStatus: AffiliateReturnStatus;
      responseStatus: number;
      signed: boolean;
      affiliateCode: string;
    }
  | {
      ok: false;
      message: string;
      orderId?: string;
      landingDomainId?: string;
      callbackStatus?: AffiliateReturnStatus;
      responseStatus?: number;
      signed?: boolean;
      affiliateCode?: string;
    };

export function resolveAffiliateReturnStatus(
  status: OrderStatus,
): AffiliateReturnStatus | null {
  switch (status) {
    case OrderStatus.PAID:
      return "paid";
    case OrderStatus.FAILED:
      return "failed";
    case OrderStatus.EXPIRED:
      return "expired";
    case OrderStatus.CANCELED:
      return "canceled";
    default:
      return null;
  }
}

async function buildDeliveryPlan(orderId: string): Promise<DeliveryPlan | DeliverAffiliateReturnCallbackResult> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      affiliate: true,
      landingDomain: true,
    },
  });

  if (!order) {
    return {
      ok: false,
      message: "订单不存在。",
    };
  }

  const callbackStatus = resolveAffiliateReturnStatus(order.status);

  if (!callbackStatus) {
    return {
      ok: false,
      orderId: order.id,
      landingDomainId: order.landingDomainId,
      message: "只有已完成的终态订单才支持重发回跳。",
    };
  }

  if (!order.returnUrl) {
    return {
      ok: false,
      orderId: order.id,
      landingDomainId: order.landingDomainId,
      callbackStatus,
      message: "当前订单没有配置分销商回跳地址。",
    };
  }

  let requestUrl = buildReturnUrl(order.returnUrl, {
    orderId: order.id,
    externalOrderId: order.externalOrderId,
    affiliateCode: order.affiliate.code,
    status: callbackStatus,
  });
  let signed = false;

  if (order.affiliate.callbackSecretEncrypted) {
    const ts = Math.floor(Date.now() / 1000).toString();
    const secret = decryptValue(order.affiliate.callbackSecretEncrypted);
    const sig = createAffiliateCallbackSignature(
      {
        affiliateCode: order.affiliate.code,
        orderId: order.id,
        externalOrderId: order.externalOrderId,
        status: callbackStatus,
        ts,
      },
      secret,
    );

    requestUrl = buildReturnUrl(order.returnUrl, {
      orderId: order.id,
      externalOrderId: order.externalOrderId,
      affiliateCode: order.affiliate.code,
      status: callbackStatus,
      ts,
      sig,
    });
    signed = true;
  }

  const logRequestUrl = buildReturnUrl(order.returnUrl, {
    orderId: order.id,
    externalOrderId: order.externalOrderId,
    affiliateCode: order.affiliate.code,
    status: callbackStatus,
  });

  return {
    orderId: order.id,
    landingDomainId: order.landingDomainId,
    affiliateCode: order.affiliate.code,
    callbackStatus,
    requestUrl,
    logRequestUrl,
    signed,
  };
}

export async function deliverAffiliateReturnCallback(
  orderId: string,
): Promise<DeliverAffiliateReturnCallbackResult> {
  const plan = await buildDeliveryPlan(orderId);

  if ("ok" in plan) {
    return plan;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(plan.requestUrl, {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "User-Agent": "shopa-admin-callback-resend/1.0",
      },
    });
    const successful = response.status >= 200 && response.status < 400;

    await writeRedirectLog({
      orderId: plan.orderId,
      landingDomainId: plan.landingDomainId,
      eventType: "admin.callback_resend",
      result: successful ? LogResult.SUCCESS : LogResult.FAILURE,
      status: plan.callbackStatus,
      requestUrl: plan.logRequestUrl,
      message: successful
        ? `Affiliate callback resent with HTTP ${response.status}.`
        : `Affiliate callback resend failed with HTTP ${response.status}.`,
      metadata: {
        affiliateCode: plan.affiliateCode,
        signed: plan.signed,
        httpStatus: response.status,
      },
    });

    return successful
      ? {
          ok: true,
          message: `回跳通知已重发，对方返回 HTTP ${response.status}。`,
          orderId: plan.orderId,
          landingDomainId: plan.landingDomainId,
          callbackStatus: plan.callbackStatus,
          responseStatus: response.status,
          signed: plan.signed,
          affiliateCode: plan.affiliateCode,
        }
      : {
          ok: false,
          message: `回跳通知已发出，但对方返回 HTTP ${response.status}。`,
          orderId: plan.orderId,
          landingDomainId: plan.landingDomainId,
          callbackStatus: plan.callbackStatus,
          responseStatus: response.status,
          signed: plan.signed,
          affiliateCode: plan.affiliateCode,
        };
  } catch (error) {
    const message = error instanceof Error ? error.message : "回跳通知请求失败。";

    await writeRedirectLog({
      orderId: plan.orderId,
      landingDomainId: plan.landingDomainId,
      eventType: "admin.callback_resend",
      result: LogResult.FAILURE,
      status: plan.callbackStatus,
      requestUrl: plan.logRequestUrl,
      message,
      metadata: {
        affiliateCode: plan.affiliateCode,
        signed: plan.signed,
      },
    });

    return {
      ok: false,
      message,
      orderId: plan.orderId,
      landingDomainId: plan.landingDomainId,
      callbackStatus: plan.callbackStatus,
      signed: plan.signed,
      affiliateCode: plan.affiliateCode,
    };
  } finally {
    clearTimeout(timeout);
  }
}
