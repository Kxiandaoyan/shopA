import { describe, expect, it } from "vitest";
import type { LandingOrderContext } from "@/lib/orders/order-context";
import { buildHostedCheckoutLineItems } from "@/lib/stripe/checkout";

describe("buildHostedCheckoutLineItems", () => {
  it("charges affiliate intake orders by the imported order total", () => {
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

    const lineItems = buildHostedCheckoutLineItems(order);

    expect(lineItems).toHaveLength(1);
    expect(lineItems[0]).toMatchObject({
      quantity: 1,
      price_data: {
        currency: "usd",
        product_data: {
          name: "Affiliate order AAA-20260321-0001",
        },
        unit_amount: 8850,
      },
    });
  });

  it("keeps direct storefront orders itemized", () => {
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
      items: [
        {
          id: "item_1",
          productName: "Store product",
          quantity: 2,
          unitPrice: 29.99,
        },
      ],
    };

    const lineItems = buildHostedCheckoutLineItems(order);

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
