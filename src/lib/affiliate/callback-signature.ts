import crypto from "node:crypto";
import { db } from "@/lib/db";
import { decryptValue } from "@/lib/security/encryption";
import { buildReturnUrl } from "@/lib/stripe/urls";

export type CallbackPayload = {
  affiliateCode: string;
  orderId: string;
  externalOrderId: string;
  status: string;
  ts: string;
};

export type AsyncWebhookSignaturePayload = {
  event: string;
  affiliateCode: string;
  orderId: string;
  externalOrderId: string;
  status: string;
  amount: string;
  currency: string;
  ts: string;
};

export const DEFAULT_CALLBACK_MAX_AGE_SECONDS = 300;

export function createAffiliateCallbackSignature(payload: CallbackPayload, secret: string) {
  return crypto
    .createHmac("sha256", secret)
    .update(
      [
        payload.affiliateCode,
        payload.orderId,
        payload.externalOrderId,
        payload.status,
        payload.ts,
      ].join("."),
    )
    .digest("hex");
}

export function isAffiliateCallbackTimestampFresh(
  ts: string,
  options: {
    nowMs?: number;
    maxAgeSeconds?: number;
  } = {},
) {
  const nowMs = options.nowMs ?? Date.now();
  const maxAgeSeconds = options.maxAgeSeconds ?? DEFAULT_CALLBACK_MAX_AGE_SECONDS;
  const parsed = Number(ts);

  if (!Number.isFinite(parsed)) {
    return false;
  }

  const ageSeconds = Math.abs(nowMs / 1000 - parsed);
  return ageSeconds <= maxAgeSeconds;
}

export async function buildSignedAffiliateReturnUrl(input: {
  token: string;
  host: string;
  status: string;
}) {
  const order = await db.order.findUnique({
    where: { token: input.token },
    include: {
      affiliate: true,
      landingDomain: true,
    },
  });

  if (!order || order.landingDomain.hostname !== input.host || !order.returnUrl) {
    return null;
  }

  if (!order.affiliate.callbackSecretEncrypted) {
    return buildReturnUrl(order.returnUrl, {
      orderId: order.id,
      externalOrderId: order.externalOrderId,
      affiliateCode: order.affiliate.code,
      status: input.status,
    });
  }

  const ts = Math.floor(Date.now() / 1000).toString();
  const secret = decryptValue(order.affiliate.callbackSecretEncrypted);
  const payload: CallbackPayload = {
    affiliateCode: order.affiliate.code,
    orderId: order.id,
    externalOrderId: order.externalOrderId,
    status: input.status,
    ts,
  };

  const sig = createAffiliateCallbackSignature(payload, secret);

  return buildReturnUrl(order.returnUrl, {
    orderId: order.id,
    externalOrderId: order.externalOrderId,
    affiliateCode: order.affiliate.code,
    status: input.status,
    ts,
    sig,
  });
}

export function verifyAffiliateCallbackSignature(
  payload: CallbackPayload & { sig: string },
  secret: string,
) {
  const expected = createAffiliateCallbackSignature(payload, secret);

  if (expected.length !== payload.sig.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(payload.sig));
}

export function verifyAffiliateCallbackPayload(
  payload: CallbackPayload & { sig: string },
  secret: string,
  options?: {
    nowMs?: number;
    maxAgeSeconds?: number;
  },
) {
  if (!isAffiliateCallbackTimestampFresh(payload.ts, options)) {
    return false;
  }

  return verifyAffiliateCallbackSignature(payload, secret);
}

export function createAffiliateAsyncWebhookSignature(
  payload: AsyncWebhookSignaturePayload,
  secret: string,
) {
  return crypto
    .createHmac("sha256", secret)
    .update(
      [
        payload.event,
        payload.affiliateCode,
        payload.orderId,
        payload.externalOrderId,
        payload.status,
        payload.amount,
        payload.currency,
        payload.ts,
      ].join("."),
    )
    .digest("hex");
}

export function verifyAffiliateAsyncWebhookSignature(
  payload: AsyncWebhookSignaturePayload & { sig: string },
  secret: string,
) {
  const expected = createAffiliateAsyncWebhookSignature(payload, secret);

  if (expected.length !== payload.sig.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(payload.sig));
}
