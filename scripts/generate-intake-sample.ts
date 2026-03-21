import crypto from "node:crypto";
import { createIntakeSignature } from "@/lib/intake/verify-signature";

type UnsignedPayload = {
  affiliateCode: string;
  externalOrderId: string;
  timestamp: number;
  nonce: string;
  buyer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    country: string;
    state: string;
    city: string;
    address1: string;
    address2: string;
    postalCode: string;
  };
  totalAmount: number;
  currency: string;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
  returnUrl: string;
};

function buildPayload(): UnsignedPayload {
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomUUID();
  const externalOrderId = `DEMO-${timestamp}`;

  return {
    affiliateCode: process.env.SAMPLE_AFFILIATE_CODE ?? "AFF_DEMO",
    externalOrderId,
    timestamp,
    nonce,
    buyer: {
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      phone: "+15550000000",
      country: "US",
      state: "CA",
      city: "Los Angeles",
      address1: "123 Main St",
      address2: "",
      postalCode: "90001",
    },
    totalAmount: 29.99,
    currency: "USD",
    items: [
      {
        productId: "clean001",
        name: "SmartSpray Microfiber Floor Mop",
        quantity: 1,
        unitPrice: 29.99,
      },
    ],
    returnUrl:
      process.env.SAMPLE_RETURN_URL ?? "https://aaa.com/order-complete",
  };
}

const secret = process.env.SAMPLE_INTAKE_SECRET ?? "replace-me";
const payload = buildPayload();
const requestBody = {
  ...payload,
  signature: createIntakeSignature(payload, secret),
};

console.log(JSON.stringify(requestBody, null, 2));
