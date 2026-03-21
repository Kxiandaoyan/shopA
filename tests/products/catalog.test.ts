import { describe, expect, it } from "vitest";
import { loadCatalogSource } from "@/lib/products/catalog";

describe("loadCatalogSource", () => {
  it("loads products from the provided txt source file", async () => {
    const products = await loadCatalogSource();

    expect(products).toHaveLength(4);
    expect(products[0]).toMatchObject({
      id: "clean001",
      currency: "USD",
    });
    expect(products[0].features.length).toBeGreaterThan(0);
  });
});
