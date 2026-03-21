import { describe, expect, it } from "vitest";
import { productAdminSchema } from "@/lib/admin/schemas";

describe("product admin schema", () => {
  it("normalizes currency to uppercase", () => {
    const parsed = productAdminSchema.parse({
      id: "sku-1",
      name: "Starter Kit",
      category: "Cleaning",
      price: "19.9",
      currency: "usd",
      image: "https://example.com/product.jpg",
      description: "A compact kit for quick daily cleaning.",
      features: ["Fast setup", "Lightweight"],
    });

    expect(parsed.price).toBe(19.9);
    expect(parsed.currency).toBe("USD");
  });

  it("rejects empty features", () => {
    const parsed = productAdminSchema.safeParse({
      id: "sku-1",
      name: "Starter Kit",
      category: "Cleaning",
      price: 19.9,
      currency: "USD",
      image: "https://example.com/product.jpg",
      description: "A compact kit for quick daily cleaning.",
      features: ["Fast setup", ""],
    });

    expect(parsed.success).toBe(false);
  });
});
