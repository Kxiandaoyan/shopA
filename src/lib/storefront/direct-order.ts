import crypto from "node:crypto";
import { OrderStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { createOrderToken } from "@/lib/intake/token";
import { writeRedirectLog } from "@/lib/logging/events";
import { loadCatalogSource } from "@/lib/products/catalog";

export const DIRECT_AFFILIATE_CODE = "STORE_DIRECT";
const DIRECT_AFFILIATE_NAME = "Direct Storefront Orders";

export type DirectOrderInput = {
  host: string;
  productId: string;
  quantity: number;
  buyer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    country: string;
    state: string;
    city: string;
    address1: string;
    address2?: string;
    postalCode: string;
  };
};

async function ensureDirectAffiliate() {
  return db.affiliate.upsert({
    where: { code: DIRECT_AFFILIATE_CODE },
    update: {
      name: DIRECT_AFFILIATE_NAME,
      isActive: true,
    },
    create: {
      code: DIRECT_AFFILIATE_CODE,
      name: DIRECT_AFFILIATE_NAME,
      isActive: true,
    },
  });
}

async function loadDirectProduct(productId: string) {
  const dbProduct = await db.product.findUnique({
    where: { id: productId },
  });

  if (dbProduct) {
    return {
      id: dbProduct.id,
      persistedProductId: dbProduct.id,
      name: dbProduct.name,
      price: Number(dbProduct.price),
      currency: dbProduct.currency,
    };
  }

  const sourceProduct = (await loadCatalogSource()).find((item) => item.id === productId);

  if (!sourceProduct) {
    return null;
  }

  return {
    id: sourceProduct.id,
    persistedProductId: null,
    name: sourceProduct.name,
    price: sourceProduct.price,
    currency: sourceProduct.currency,
  };
}

function buildDirectExternalOrderId() {
  return `WEB-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

export async function createDirectStorefrontOrder(input: DirectOrderInput) {
  const landingDomain = await db.landingDomain.findUnique({
    where: { hostname: input.host },
  });

  if (!landingDomain || !landingDomain.isActive) {
    await writeRedirectLog({
      eventType: "storefront.direct_order_domain_missing",
      requestUrl: `https://${input.host}/api/storefront/orders`,
      message: "Direct checkout was requested on a host with no active landing domain.",
      metadata: {
        host: input.host,
      },
    });

    return {
      ok: false as const,
      status: 400,
      message: "This storefront domain is not configured yet.",
    };
  }

  const product = await loadDirectProduct(input.productId);

  if (!product) {
    return {
      ok: false as const,
      status: 404,
      message: "The selected product could not be found.",
    };
  }

  const affiliate = await ensureDirectAffiliate();
  const externalOrderId = buildDirectExternalOrderId();
  const totalAmount = Number((product.price * input.quantity).toFixed(2));
  const tokenSeed = `${input.host}:${externalOrderId}:${crypto.randomUUID()}`;
  const token = createOrderToken(tokenSeed);

  const order = await db.order.create({
    data: {
      affiliateId: affiliate.id,
      landingDomainId: landingDomain.id,
      externalOrderId,
      buyerEmail: input.buyer.email,
      buyerFirstName: input.buyer.firstName,
      buyerLastName: input.buyer.lastName,
      buyerPhone: input.buyer.phone,
      country: input.buyer.country,
      state: input.buyer.state,
      city: input.buyer.city,
      address1: input.buyer.address1,
      address2: input.buyer.address2,
      postalCode: input.buyer.postalCode,
      totalAmount: new Prisma.Decimal(totalAmount),
      currency: product.currency,
      returnUrl: null,
      token,
      status: OrderStatus.DRAFT,
      items: {
        create: {
          productId: product.persistedProductId,
          productName: product.name,
          quantity: input.quantity,
          unitPrice: new Prisma.Decimal(product.price),
          metadata: {
            source: "direct_storefront",
          },
        },
      },
    },
  });

  await writeRedirectLog({
    orderId: order.id,
    landingDomainId: landingDomain.id,
    eventType: "storefront.direct_order_created",
    status: order.status,
    requestUrl: `https://${input.host}/api/storefront/orders`,
    metadata: {
      externalOrderId,
      productId: product.id,
      quantity: input.quantity,
      totalAmount,
      currency: product.currency,
      mode: "direct_storefront",
    },
  });

  return {
    ok: true as const,
    orderId: order.id,
    token,
    landingPath: `/?token=${token}`,
  };
}
