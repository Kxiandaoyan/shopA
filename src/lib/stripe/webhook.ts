import {
  LogResult,
  OrderStatus,
  PaymentStatus,
  Prisma,
} from "@prisma/client";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { writeRedirectLog } from "@/lib/logging/events";
import { decryptValue } from "@/lib/security/encryption";
import { createStripeClient } from "@/lib/stripe/client";
import { applyPaymentState } from "@/lib/stripe/order-state";

type ResolvedWebhookEvent = {
  event: Stripe.Event;
  stripeAccountId: string;
};

async function constructWebhookEventForAccount(
  stripeAccountId: string,
  payload: string,
  stripeSignature: string,
) {
  const account = await db.stripeAccount.findUnique({
    where: { id: stripeAccountId },
  });

  if (!account || !account.isActive) {
    return null;
  }

  try {
    const secretKey = decryptValue(account.secretKeyEncrypted);
    const webhookSecret = decryptValue(account.webhookSecret);
    const event = createStripeClient(secretKey).webhooks.constructEvent(
      payload,
      stripeSignature,
      webhookSecret,
    );

    return {
      event,
      stripeAccountId: account.id,
    } satisfies ResolvedWebhookEvent;
  } catch {
    return null;
  }
}

export async function resolveWebhookEventForAccount(
  stripeAccountId: string,
  payload: string,
  stripeSignature: string,
) {
  return constructWebhookEventForAccount(stripeAccountId, payload, stripeSignature);
}

export async function resolveWebhookEvent(payload: string, stripeSignature: string) {
  const activeAccounts = await db.stripeAccount.findMany({
    where: { isActive: true },
    select: { id: true },
    take: 2,
  });

  if (activeAccounts.length !== 1) {
    return null;
  }

  return constructWebhookEventForAccount(activeAccounts[0].id, payload, stripeSignature);
}

async function loadPaymentSessionByStripeRef(input: {
  stripeSessionId?: string | null;
  stripePaymentIntentId?: string | null;
}) {
  if (!input.stripeSessionId && !input.stripePaymentIntentId) {
    return null;
  }

  const orFilters: Prisma.PaymentSessionWhereInput[] = [];

  if (input.stripeSessionId) {
    orFilters.push({ stripeSessionId: input.stripeSessionId });
  }

  if (input.stripePaymentIntentId) {
    orFilters.push({ stripePaymentIntentId: input.stripePaymentIntentId });
  }

  return db.paymentSession.findFirst({
    where: {
      OR: orFilters,
    },
    include: {
      order: true,
    },
  });
}

async function validatePaymentSessionOwnership(input: {
  paymentSession: Awaited<ReturnType<typeof loadPaymentSessionByStripeRef>>;
  stripeAccountId: string;
  eventType: string;
  stripeSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  metadataOrderId?: string | null;
  metadataLandingDomainId?: string | null;
}) {
  const paymentSession = input.paymentSession;

  if (!paymentSession) {
    await writeRedirectLog({
      eventType: "stripe.webhook.payment_session_missing",
      result: LogResult.FAILURE,
      metadata: {
        webhookEventType: input.eventType,
        stripeAccountId: input.stripeAccountId,
        stripeSessionId: input.stripeSessionId ?? null,
        stripePaymentIntentId: input.stripePaymentIntentId ?? null,
      },
    });
    return null;
  }

  if (paymentSession.stripeAccountId !== input.stripeAccountId) {
    await writeRedirectLog({
      orderId: paymentSession.orderId,
      landingDomainId: paymentSession.order.landingDomainId,
      eventType: "stripe.webhook.account_mismatch",
      result: LogResult.FAILURE,
      status: paymentSession.order.status,
      metadata: {
        webhookEventType: input.eventType,
        expectedStripeAccountId: paymentSession.stripeAccountId,
        receivedStripeAccountId: input.stripeAccountId,
        stripeSessionId: input.stripeSessionId ?? null,
        stripePaymentIntentId: input.stripePaymentIntentId ?? null,
      },
    });
    return null;
  }

  if (input.metadataOrderId && input.metadataOrderId !== paymentSession.orderId) {
    await writeRedirectLog({
      orderId: paymentSession.orderId,
      landingDomainId: paymentSession.order.landingDomainId,
      eventType: "stripe.webhook.order_mismatch",
      result: LogResult.FAILURE,
      status: paymentSession.order.status,
      metadata: {
        webhookEventType: input.eventType,
        expectedOrderId: paymentSession.orderId,
        metadataOrderId: input.metadataOrderId,
      },
    });
    return null;
  }

  if (
    input.metadataLandingDomainId &&
    input.metadataLandingDomainId !== paymentSession.order.landingDomainId
  ) {
    await writeRedirectLog({
      orderId: paymentSession.orderId,
      landingDomainId: paymentSession.order.landingDomainId,
      eventType: "stripe.webhook.domain_mismatch",
      result: LogResult.FAILURE,
      status: paymentSession.order.status,
      metadata: {
        webhookEventType: input.eventType,
        expectedLandingDomainId: paymentSession.order.landingDomainId,
        metadataLandingDomainId: input.metadataLandingDomainId,
      },
    });
    return null;
  }

  return paymentSession;
}

export async function processWebhookEvent(resolved: ResolvedWebhookEvent) {
  switch (resolved.event.type) {
    case "checkout.session.completed": {
      const session = resolved.event.data.object as Stripe.Checkout.Session;
      const paymentSession = await loadPaymentSessionByStripeRef({
        stripeSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : null,
      });
      const validated = await validatePaymentSessionOwnership({
        paymentSession,
        stripeAccountId: resolved.stripeAccountId,
        eventType: resolved.event.type,
        stripeSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : null,
        metadataOrderId: session.metadata?.orderId ?? null,
        metadataLandingDomainId: session.metadata?.landingDomainId ?? null,
      });

      if (!validated) {
        return;
      }

      await applyPaymentState({
        orderId: validated.orderId,
        landingDomainId: validated.order.landingDomainId,
        stripeSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : null,
        orderStatus:
          session.payment_status === "paid" ? OrderStatus.PAID : OrderStatus.CHECKOUT_CREATED,
        paymentStatus:
          session.payment_status === "paid" ? PaymentStatus.SUCCEEDED : PaymentStatus.CREATED,
        eventType: "stripe.webhook.checkout_completed",
        metadata: {
          stripeEventType: resolved.event.type,
          stripeSessionId: session.id,
          stripeAccountId: resolved.stripeAccountId,
        },
      });
      return;
    }
    case "checkout.session.expired": {
      const session = resolved.event.data.object as Stripe.Checkout.Session;
      const paymentSession = await loadPaymentSessionByStripeRef({
        stripeSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : null,
      });
      const validated = await validatePaymentSessionOwnership({
        paymentSession,
        stripeAccountId: resolved.stripeAccountId,
        eventType: resolved.event.type,
        stripeSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : null,
        metadataOrderId: session.metadata?.orderId ?? null,
        metadataLandingDomainId: session.metadata?.landingDomainId ?? null,
      });

      if (!validated) {
        return;
      }

      await applyPaymentState({
        orderId: validated.orderId,
        landingDomainId: validated.order.landingDomainId,
        stripeSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : null,
        orderStatus: OrderStatus.EXPIRED,
        paymentStatus: PaymentStatus.EXPIRED,
        eventType: "stripe.webhook.checkout_expired",
        metadata: {
          stripeEventType: resolved.event.type,
          stripeSessionId: session.id,
          stripeAccountId: resolved.stripeAccountId,
        },
      });
      return;
    }
    case "payment_intent.succeeded": {
      const paymentIntent = resolved.event.data.object as Stripe.PaymentIntent;
      const paymentSession = await loadPaymentSessionByStripeRef({
        stripePaymentIntentId: paymentIntent.id,
      });
      const validated = await validatePaymentSessionOwnership({
        paymentSession,
        stripeAccountId: resolved.stripeAccountId,
        eventType: resolved.event.type,
        stripePaymentIntentId: paymentIntent.id,
      });

      if (!validated) {
        return;
      }

      await applyPaymentState({
        orderId: validated.orderId,
        landingDomainId: validated.order.landingDomainId,
        stripePaymentIntentId: paymentIntent.id,
        orderStatus: OrderStatus.PAID,
        paymentStatus: PaymentStatus.SUCCEEDED,
        eventType: "stripe.webhook.payment_succeeded",
        metadata: {
          stripeEventType: resolved.event.type,
          paymentIntentId: paymentIntent.id,
          stripeAccountId: resolved.stripeAccountId,
        },
      });
      return;
    }
    case "payment_intent.payment_failed": {
      const paymentIntent = resolved.event.data.object as Stripe.PaymentIntent;
      const paymentSession = await loadPaymentSessionByStripeRef({
        stripePaymentIntentId: paymentIntent.id,
      });
      const validated = await validatePaymentSessionOwnership({
        paymentSession,
        stripeAccountId: resolved.stripeAccountId,
        eventType: resolved.event.type,
        stripePaymentIntentId: paymentIntent.id,
      });

      if (!validated) {
        return;
      }

      await applyPaymentState({
        orderId: validated.orderId,
        landingDomainId: validated.order.landingDomainId,
        stripePaymentIntentId: paymentIntent.id,
        orderStatus: OrderStatus.FAILED,
        paymentStatus: PaymentStatus.FAILED,
        eventType: "stripe.webhook.payment_failed",
        metadata: {
          stripeEventType: resolved.event.type,
          paymentIntentId: paymentIntent.id,
          stripeAccountId: resolved.stripeAccountId,
        },
      });
      return;
    }
    default: {
      await writeRedirectLog({
        eventType: "stripe.webhook.ignored",
        metadata: {
          stripeEventType: resolved.event.type,
          stripeAccountId: resolved.stripeAccountId,
        },
      });
    }
  }
}
