import { describe, expect, it } from "vitest";
import { resolveStorefrontTemplate } from "@/lib/storefront/template-resolver";

describe("resolveStorefrontTemplate", () => {
  it("returns the provided valid template", () => {
    expect(resolveStorefrontTemplate("B")).toBe("B");
  });

  it("falls back to template A when unset", () => {
    expect(resolveStorefrontTemplate(undefined)).toBe("A");
  });

  it("falls back to template A when invalid", () => {
    expect(resolveStorefrontTemplate("Z")).toBe("A");
  });
});
