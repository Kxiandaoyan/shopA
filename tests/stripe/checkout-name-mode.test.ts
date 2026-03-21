import { describe, expect, it } from "vitest";
import {
  DEFAULT_AFFILIATE_CHECKOUT_NAME_MODE,
  normalizeAffiliateCheckoutNameMode,
} from "@/lib/stripe/checkout-name-mode";

describe("normalizeAffiliateCheckoutNameMode", () => {
  it("keeps supported values unchanged", () => {
    expect(normalizeAffiliateCheckoutNameMode("FIXED")).toBe("FIXED");
    expect(normalizeAffiliateCheckoutNameMode("CATALOG_RANDOM")).toBe("CATALOG_RANDOM");
    expect(normalizeAffiliateCheckoutNameMode("SOURCE_PRODUCT")).toBe("SOURCE_PRODUCT");
  });

  it("falls back to the default mode for invalid values", () => {
    expect(normalizeAffiliateCheckoutNameMode("invalid")).toBe(
      DEFAULT_AFFILIATE_CHECKOUT_NAME_MODE,
    );
    expect(normalizeAffiliateCheckoutNameMode(null)).toBe(
      DEFAULT_AFFILIATE_CHECKOUT_NAME_MODE,
    );
  });
});
