export const AFFILIATE_CHECKOUT_NAME_MODES = [
  "FIXED",
  "CATALOG_RANDOM",
  "SOURCE_PRODUCT",
] as const;

export type AffiliateCheckoutNameMode = (typeof AFFILIATE_CHECKOUT_NAME_MODES)[number];

export const DEFAULT_AFFILIATE_CHECKOUT_NAME_MODE: AffiliateCheckoutNameMode = "CATALOG_RANDOM";

export function normalizeAffiliateCheckoutNameMode(
  value: string | null | undefined,
): AffiliateCheckoutNameMode {
  return AFFILIATE_CHECKOUT_NAME_MODES.includes(value as AffiliateCheckoutNameMode)
    ? (value as AffiliateCheckoutNameMode)
    : DEFAULT_AFFILIATE_CHECKOUT_NAME_MODE;
}
