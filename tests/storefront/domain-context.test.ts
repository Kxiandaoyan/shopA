import { describe, expect, it } from "vitest";
import { resolveStorefrontTemplate } from "@/lib/storefront/template-resolver";

describe("domain template fallback behavior", () => {
  it("uses A when no explicit template is configured", () => {
    expect(resolveStorefrontTemplate(null)).toBe("A");
  });

  it("preserves configured template codes", () => {
    expect(resolveStorefrontTemplate("C")).toBe("C");
  });
});
