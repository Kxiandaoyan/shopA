import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LandingOrderContext } from "@/lib/orders/order-context";
import { buildHostedCheckoutLineItems } from "@/lib/stripe/checkout";

const getStorefrontProductsMock = vi.fn();

vi.mock("@/lib/products/catalog", () => ({
  getStorefrontProducts: (...args: unknown[]) => getStorefrontProductsMock(...args),
}));

describe("buildHostedCheckoutLineItems", () => {
  beforeEach(() => {
    getStorefrontProductsMock.mockReset();
  });

  it("charges affiliate intake orders by the imported order total and can use a random storefront product name", async () => {
    const order: LandingOrderContext = {
      orderId: "ord_aff_1",
      externalOrderId: "AAA-20260321-0001",
      token: "tok_aff_1",
      status: "DRAFT",
      totalAmount: 88.5,
      currency: "USD",
      buyerName: "John Doe",
      orderMode: "affiliate_intake",
      landingDomainId: "dom_1",
      landingHostname: "pay.example.com",
      returnUrl: "https://affiliate.example.com/complete",
      affiliateCheckoutNameMode: "CATALOG_RANDOM",
      affiliateCheckoutFixedName: null,
      items: [
        {
          id: "item_1",
          productName: "Imported bundle A",
          quantity: 2,
          unitPrice: 19.99,
        },
        {
          id: "item_2",
          productName: "Imported bundle B",
          quantity: 1,
          unitPrice: 9.99,
        },
      ],
    };

    getStorefrontProductsMock.mockResolvedValue([
      {
        id: "prod_1",
        name: "Velvet Repair Serum",
        category: "Beauty",
        price: 39.99,
        currency: "USD",
        image: "/a.jpg",
        description: "A",
        features: [],
      },
      {
        id: "prod_2",
        name: "Contour Lift Cream",
        category: "Beauty",
        price: 29.99,
        currency: "USD",
        image: "/b.jpg",
        description: "B",
        features: [],
      },
    ]);

    const lineItems = await buildHostedCheckoutLineItems(order);

    expect(lineItems).toHaveLength(1);
    expect(lineItems[0]).toMatchObject({
      quantity: 1,
      price_data: {
        currency: "usd",
        product_data: {
          name: "Contour Lift Cream",
        },
        unit_amount: 8850,
      },
    });
  });

  it("falls back to a neutral storefront name when the catalog is unavailable", async () => {
    const order: LandingOrderContext = {
      orderId: "ord_aff_2",
      externalOrderId: "AAA-20260321-0002",
      token: "tok_aff_2",
      status: "DRAFT",
      totalAmount: 49.99,
      currency: "USD",
      buyerName: "John Doe",
      orderMode: "affiliate_intake",
      landingDomainId: "dom_1",
      landingHostname: "pay.example.com",
      returnUrl: "https://affiliate.example.com/complete",
      affiliateCheckoutNameMode: "CATALOG_RANDOM",
      affiliateCheckoutFixedName: null,
      items: [
        {
          id: "item_1",
          productName: "Imported hidden product",
          quantity: 1,
          unitPrice: 49.99,
        },
      ],
    };

    getStorefrontProductsMock.mockRejectedValue(new Error("catalog unavailable"));

    const lineItems = await buildHostedCheckoutLineItems(order);

    expect(lineItems[0]).toMatchObject({
      price_data: {
        product_data: {
          name: "Store order",
        },
      },
    });
  });

  it("uses the configured fixed checkout name when the domain strategy is fixed", async () => {
    const order: LandingOrderContext = {
      orderId: "ord_aff_3",
      externalOrderId: "AAA-20260321-0003",
      token: "tok_aff_3",
      status: "DRAFT",
      totalAmount: 31.5,
      currency: "USD",
      buyerName: "John Doe",
      orderMode: "affiliate_intake",
      landingDomainId: "dom_1",
      landingHostname: "pay.example.com",
      returnUrl: "https://affiliate.example.com/complete",
      affiliateCheckoutNameMode: "FIXED",
      affiliateCheckoutFixedName: "Wellness Store Order",
      items: [
        {
          id: "item_1",
          productName: "Imported source name",
          quantity: 1,
          unitPrice: 31.5,
        },
      ],
    };

    const lineItems = await buildHostedCheckoutLineItems(order);

    expect(getStorefrontProductsMock).not.toHaveBeenCalled();
    expect(lineItems[0]).toMatchObject({
      price_data: {
        product_data: {
          name: "Wellness Store Order",
        },
      },
    });
  });

  it("uses the imported source product name when the domain strategy is source product", async () => {
    const order: LandingOrderContext = {
      orderId: "ord_aff_4",
      externalOrderId: "AAA-20260321-0004",
      token: "tok_aff_4",
      status: "DRAFT",
      totalAmount: 69,
      currency: "USD",
      buyerName: "John Doe",
      orderMode: "affiliate_intake",
      landingDomainId: "dom_1",
      landingHostname: "pay.example.com",
      returnUrl: "https://affiliate.example.com/complete",
      affiliateCheckoutNameMode: "SOURCE_PRODUCT",
      affiliateCheckoutFixedName: null,
      items: [
        {
          id: "item_1",
          productName: "Partner Premium Bundle",
          quantity: 1,
          unitPrice: 69,
        },
      ],
    };

    const lineItems = await buildHostedCheckoutLineItems(order);

    expect(getStorefrontProductsMock).not.toHaveBeenCalled();
    expect(lineItems[0]).toMatchObject({
      price_data: {
        product_data: {
          name: "Partner Premium Bundle",
        },
      },
    });
  });

  it("keeps direct storefront orders itemized", async () => {
    const order: LandingOrderContext = {
      orderId: "ord_dir_1",
      externalOrderId: "WEB-001",
      token: "tok_dir_1",
      status: "DRAFT",
      totalAmount: 59.98,
      currency: "USD",
      buyerName: "Jane Doe",
      orderMode: "direct_storefront",
      landingDomainId: "dom_1",
      landingHostname: "shop.example.com",
      returnUrl: null,
      affiliateCheckoutNameMode: "CATALOG_RANDOM",
      affiliateCheckoutFixedName: null,
      items: [
        {
          id: "item_1",
          productName: "Store product",
          quantity: 2,
          unitPrice: 29.99,
        },
      ],
    };

    const lineItems = await buildHostedCheckoutLineItems(order);

    expect(lineItems).toHaveLength(1);
    expect(lineItems[0]).toMatchObject({
      quantity: 2,
      price_data: {
        currency: "usd",
        product_data: {
          name: "Store product",
        },
        unit_amount: 2999,
      },
    });
  });
});
