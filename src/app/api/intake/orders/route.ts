import { Prisma, LogResult, OrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { intakeOrderSchema } from "@/lib/intake/schema";
import { createOrderToken } from "@/lib/intake/token";
import { isIntakeTimestampFresh } from "@/lib/intake/timestamp";
import { verifyIntakeSignature } from "@/lib/intake/verify-signature";
import { writeRedirectLog } from "@/lib/logging/events";
import { decryptValue } from "@/lib/security/encryption";

function randomItem<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

async function buildReuseResponse(orderId: string) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      landingDomain: true,
    },
  });

  if (!order) {
    return null;
  }

  return {
    ok: true,
    orderId: order.id,
    token: order.token,
    landingDomain: order.landingDomain.hostname,
    landingUrl: `https://${order.landingDomain.hostname}/?token=${order.token}`,
    reused: true,
  };
}

function resolveAffiliateIntakeSecret(affiliate: {
  intakeSecretEncrypted: string | null;
}) {
  if (affiliate.intakeSecretEncrypted) {
    return decryptValue(affiliate.intakeSecretEncrypted);
  }

  if (process.env.NODE_ENV !== "production" && env.INTAKE_SIGNATURE_SECRET) {
    return env.INTAKE_SIGNATURE_SECRET;
  }

  return null;
}

export async function POST(request: Request) {
  const rawPayload = await request.json();
  const parsed = intakeOrderSchema.safeParse(rawPayload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Invalid payload",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const payload = parsed.data;

  if (!isIntakeTimestampFresh(payload.timestamp)) {
    await writeRedirectLog({
      eventType: "intake.timestamp_rejected",
      result: LogResult.FAILURE,
      message: "Intake timestamp is outside the accepted time window.",
      metadata: {
        affiliateCode: payload.affiliateCode,
        externalOrderId: payload.externalOrderId,
        timestamp: payload.timestamp,
      },
    });

    return NextResponse.json({ ok: false, message: "Request expired" }, { status: 400 });
  }

  const affiliate = await db.affiliate.findUnique({
    where: { code: payload.affiliateCode },
    include: {
      domains: {
        where: { isActive: true },
        include: { template: true, stripeAccount: true },
      },
      returnUrls: {
        where: { isActive: true },
      },
    },
  });

  if (!affiliate || !affiliate.isActive || affiliate.domains.length === 0) {
    return NextResponse.json(
      { ok: false, message: "No active domain configured for affiliate" },
      { status: 400 },
    );
  }

  const intakeSecret = resolveAffiliateIntakeSecret(affiliate);

  if (!intakeSecret) {
    await writeRedirectLog({
      eventType: "intake.secret_missing",
      result: LogResult.FAILURE,
      message: "Affiliate intake secret is not configured.",
      metadata: {
        affiliateCode: payload.affiliateCode,
        externalOrderId: payload.externalOrderId,
      },
    });

    return NextResponse.json(
      { ok: false, message: "Affiliate intake secret is not configured" },
      { status: 400 },
    );
  }

  const signatureValid = verifyIntakeSignature(payload, intakeSecret);

  if (!signatureValid) {
    await writeRedirectLog({
      eventType: "intake.signature_rejected",
      result: LogResult.FAILURE,
      message: "Signature validation failed.",
      metadata: {
        affiliateCode: payload.affiliateCode,
        externalOrderId: payload.externalOrderId,
      },
    });

    return NextResponse.json({ ok: false, message: "Invalid signature" }, { status: 401 });
  }

  if (
    payload.returnUrl &&
    !affiliate.returnUrls.some((entry) => entry.url === payload.returnUrl)
  ) {
    return NextResponse.json(
      { ok: false, message: "Return URL is not allowlisted" },
      { status: 400 },
    );
  }

  const replayRequest = await db.intakeRequest.findUnique({
    where: {
      affiliateCode_nonce: {
        affiliateCode: payload.affiliateCode,
        nonce: payload.nonce,
      },
    },
    include: {
      order: true,
    },
  });

  if (replayRequest) {
    if (
      replayRequest.externalOrderId === payload.externalOrderId &&
      replayRequest.orderId
    ) {
      const reuseResponse = await buildReuseResponse(replayRequest.orderId);
      if (reuseResponse) {
        return NextResponse.json(reuseResponse);
      }
    }

    return NextResponse.json(
      { ok: false, message: "Replay request detected" },
      { status: 409 },
    );
  }

  const existingOrder = await db.order.findUnique({
    where: {
      affiliateId_externalOrderId: {
        affiliateId: affiliate.id,
        externalOrderId: payload.externalOrderId,
      },
    },
  });

  if (existingOrder) {
    const reuseResponse = await buildReuseResponse(existingOrder.id);
    if (reuseResponse) {
      return NextResponse.json(reuseResponse);
    }
  }

  const selectedDomain = randomItem(affiliate.domains);
  const seed = `${payload.affiliateCode}:${payload.externalOrderId}:${payload.timestamp}:${payload.nonce}`;
  const token = createOrderToken(seed);

  try {
    const order = await db.order.create({
      data: {
        affiliateId: affiliate.id,
        landingDomainId: selectedDomain.id,
        externalOrderId: payload.externalOrderId,
        buyerEmail: payload.buyer.email,
        buyerFirstName: payload.buyer.firstName,
        buyerLastName: payload.buyer.lastName,
        buyerPhone: payload.buyer.phone,
        country: payload.buyer.country,
        state: payload.buyer.state,
        city: payload.buyer.city,
        address1: payload.buyer.address1,
        address2: payload.buyer.address2,
        postalCode: payload.buyer.postalCode,
        totalAmount: new Prisma.Decimal(payload.totalAmount),
        currency: payload.currency,
        returnUrl: payload.returnUrl,
        token,
        status: OrderStatus.DRAFT,
        items: {
          create: payload.items.map((item) => ({
            productId: item.productId,
            productName: item.name ?? item.productId ?? "Imported item",
            quantity: item.quantity,
            unitPrice: new Prisma.Decimal(item.unitPrice),
            metadata: {
              sourceProductId: item.productId ?? null,
            },
          })),
        },
        intakeRequests: {
          create: {
            affiliateCode: payload.affiliateCode,
            externalOrderId: payload.externalOrderId,
            nonce: payload.nonce,
            requestTimestamp: payload.timestamp,
            requestBody: rawPayload,
            signatureValid: true,
            idempotencyKey: `${payload.affiliateCode}:${payload.externalOrderId}`,
          },
        },
      },
    });

    await writeRedirectLog({
      orderId: order.id,
      landingDomainId: selectedDomain.id,
      eventType: "intake.order_created",
      result: LogResult.SUCCESS,
      status: order.status,
      requestUrl: request.url,
      metadata: {
        affiliateCode: payload.affiliateCode,
        externalOrderId: payload.externalOrderId,
        landingDomain: selectedDomain.hostname,
      },
    });

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      token,
      landingDomain: selectedDomain.hostname,
      landingUrl: `https://${selectedDomain.hostname}/?token=${token}`,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const replayAfterConflict = await db.intakeRequest.findUnique({
        where: {
          affiliateCode_nonce: {
            affiliateCode: payload.affiliateCode,
            nonce: payload.nonce,
          },
        },
      });

      if (replayAfterConflict && replayAfterConflict.externalOrderId !== payload.externalOrderId) {
        return NextResponse.json(
          { ok: false, message: "Replay request detected" },
          { status: 409 },
        );
      }

      const reused = await db.order.findUnique({
        where: {
          affiliateId_externalOrderId: {
            affiliateId: affiliate.id,
            externalOrderId: payload.externalOrderId,
          },
        },
      });

      if (reused) {
        const reuseResponse = await buildReuseResponse(reused.id);
        if (reuseResponse) {
          return NextResponse.json(reuseResponse);
        }
      }
    }

    throw error;
  }
}
