import { describe, expect, it } from "vitest";
import {
  DEFAULT_CALLBACK_MAX_AGE_SECONDS,
  isAffiliateCallbackTimestampFresh,
  verifyAffiliateCallbackPayload,
  verifyAffiliateCallbackSignature,
} from "@/lib/affiliate/callback-signature";

describe("affiliate callback signature", () => {
  it("verifies a valid callback signature", async () => {
    const crypto = await import("node:crypto");
    const payload = {
      affiliateCode: "AFF_001",
      orderId: "ord_123",
      externalOrderId: "AAA-001",
      status: "paid",
      ts: "1773648000",
    };
    const sig = crypto
      .createHmac("sha256", "callback-secret")
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

    expect(
      verifyAffiliateCallbackSignature(
        {
          ...payload,
          sig,
        },
        "callback-secret",
      ),
    ).toBe(true);
  });

  it("rejects a forged callback signature", () => {
    expect(
      verifyAffiliateCallbackSignature(
        {
          affiliateCode: "AFF_001",
          orderId: "ord_123",
          externalOrderId: "AAA-001",
          status: "paid",
          ts: "1773648000",
          sig: "fake-signature",
        },
        "callback-secret",
      ),
    ).toBe(false);
  });

  it("rejects stale callback timestamps", async () => {
    const crypto = await import("node:crypto");
    const nowMs = 1_700_000_000_000;
    const ts = Math.floor(nowMs / 1000 - DEFAULT_CALLBACK_MAX_AGE_SECONDS - 10).toString();
    const payload = {
      affiliateCode: "AFF_001",
      orderId: "ord_123",
      externalOrderId: "AAA-001",
      status: "paid",
      ts,
    };
    const sig = crypto
      .createHmac("sha256", "callback-secret")
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

    expect(
      verifyAffiliateCallbackPayload(
        {
          ...payload,
          sig,
        },
        "callback-secret",
        { nowMs },
      ),
    ).toBe(false);
  });

  it("accepts fresh callback payloads", async () => {
    const crypto = await import("node:crypto");
    const nowMs = 1_700_000_000_000;
    const ts = Math.floor(nowMs / 1000).toString();
    const payload = {
      affiliateCode: "AFF_001",
      orderId: "ord_123",
      externalOrderId: "AAA-001",
      status: "paid",
      ts,
    };
    const sig = crypto
      .createHmac("sha256", "callback-secret")
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

    expect(
      verifyAffiliateCallbackPayload(
        {
          ...payload,
          sig,
        },
        "callback-secret",
        { nowMs },
      ),
    ).toBe(true);
  });

  it("detects malformed callback timestamps", () => {
    expect(isAffiliateCallbackTimestampFresh("not-a-timestamp")).toBe(false);
  });
});
