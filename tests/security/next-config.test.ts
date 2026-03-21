import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("next security headers", () => {
  it("registers hardened response headers", async () => {
    expect(nextConfig.poweredByHeader).toBe(false);

    const routes = await nextConfig.headers?.();
    expect(routes?.[0]?.source).toBe("/:path*");

    const headers = routes?.[0]?.headers ?? [];
    const keys = headers.map((header) => header.key);

    expect(keys).toContain("Content-Security-Policy");
    expect(keys).toContain("Referrer-Policy");
    expect(keys).toContain("X-Frame-Options");
    expect(keys).toContain("X-Content-Type-Options");
    expect(keys).toContain("Permissions-Policy");
    expect(keys).toContain("Strict-Transport-Security");
  });
});
