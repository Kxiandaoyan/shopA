import { LogResult, type OrderStatus, type PaymentStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/logging/audit";
import { writeRedirectLog } from "@/lib/logging/events";
import { DIRECT_AFFILIATE_CODE } from "@/lib/storefront/direct-order";
import { createStripeClient, loadStripeBindingByDomainId } from "@/lib/stripe/client";
import { applyPaymentState } from "@/lib/stripe/order-state";
import { mapCheckoutSessionToState } from "@/lib/stripe/session-status";
import { sessionMatchesOrderContext } from "@/lib/stripe/session-integrity";

type ResyncNoopReason =
  | "ORDER_NOT_FOUND"
  | "STRIPE_NOT_CONFIGURED"
  | "PAYMENT_SESSION_NOT_FOUND"
  | "STRIPE_SESSION_NOT_FOUND"
  | "SESSION_STILL_OPEN"
  | "SESSION_MISMATCH";

type ResyncResult =
  | {
      ok: true;
      message: string;
      orderId: string;
      status: OrderStatus;
      paymentStatus: PaymentStatus;
      stripeSessionId: string;
    }
  | {
      ok: false;
      reason: ResyncNoopReason | "LOOKUP_FAILED";
      message: string;
      orderId?: string;
      stripeSessionId?: string;
    };

export function resolveResyncTargetState(session: {
  status: string | null;
  payment_status: string | null;
}):
  | ({
      kind: "state";
    } & ReturnType<typeof mapCheckoutSessionToState>)
  | {
      kind: "noop";
      reason: ResyncNoopReason;
      message: string;
    } {
  if (session.payment_status === "paid" || session.status === "expired") {
    return {
      kind: "state" as const,
      ...mapCheckoutSessionToState(session as never),
    };
  }

  return {
    kind: "noop" as const,
    reason: "SESSION_STILL_OPEN",
    message: "Stripe Checkout 会话仍未完成，当前无需强制改写订单状态。",
  };
}

export async function resyncOrderWithStripe(
  orderId: string,
  actorId?: string,
): Promise<ResyncResult> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      affiliate: {
        select: {
          code: true,
        },
      },
      items: true,
      landingDomain: true,
      paymentSessions: {
        include: {
          stripeAccount: true,
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!order) {
    return {
      ok: false,
      reason: "ORDER_NOT_FOUND",
      message: "订单不存在。",
    };
  }

  const latestPaymentSession = order.paymentSessions[0];

  if (!latestPaymentSession?.stripeSessionId) {
    return {
      ok: false,
      reason: "PAYMENT_SESSION_NOT_FOUND",
      orderId: order.id,
      message: "当前订单没有可同步的 Stripe Checkout 会话。",
    };
  }

  const stripeBinding = await loadStripeBindingByDomainId(order.landingDomainId);

  if (!stripeBinding) {
    return {
      ok: false,
      reason: "STRIPE_NOT_CONFIGURED",
      orderId: order.id,
      stripeSessionId: latestPaymentSession.stripeSessionId,
      message: "当前落地域名没有可用的 Stripe 绑定。",
    };
  }

  try {
    const stripe = createStripeClient(stripeBinding.secretKey);
    const session = await stripe.checkout.sessions.retrieve(latestPaymentSession.stripeSessionId);

    if (
      !sessionMatchesOrderContext(session, {
        orderId: order.id,
        externalOrderId: order.externalOrderId,
        token: order.token,
        status: order.status,
        totalAmount: Number(order.totalAmount),
        currency: order.currency,
        buyerName: `${order.buyerFirstName} ${order.buyerLastName}`,
        orderMode:
          order.affiliate.code === DIRECT_AFFILIATE_CODE
            ? "direct_storefront"
            : "affiliate_intake",
        landingDomainId: order.landingDomainId,
        landingHostname: order.landingDomain.hostname,
        returnUrl: order.returnUrl,
        affiliateCheckoutNameMode: order.landingDomain.affiliateCheckoutNameMode as
          | "FIXED"
          | "CATALOG_RANDOM"
          | "SOURCE_PRODUCT",
        affiliateCheckoutFixedName: order.landingDomain.affiliateCheckoutFixedName,
        items: order.items.map((item) => ({
          id: item.id,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
        })),
      })
    ) {
      await writeRedirectLog({
        orderId: order.id,
        landingDomainId: order.landingDomainId,
        eventType: "admin.payment_resync.mismatch",
        result: LogResult.FAILURE,
        status: order.status,
        message: "Stripe Checkout 会话元数据与当前订单不匹配。",
        metadata: {
          stripeSessionId: session.id,
          sessionOrderId: session.metadata?.orderId ?? null,
          sessionLandingDomainId: session.metadata?.landingDomainId ?? null,
          sessionToken: session.metadata?.token ?? null,
        },
      });

      if (actorId) {
        await writeAuditLog({
          actorId,
          eventType: "admin.order_payment_resync",
          result: LogResult.FAILURE,
          targetType: "order",
          targetId: order.id,
          metadata: {
            reason: "SESSION_MISMATCH",
            stripeSessionId: session.id,
          },
        });
      }

      return {
        ok: false,
        reason: "SESSION_MISMATCH",
        orderId: order.id,
        stripeSessionId: session.id,
        message: "Stripe 会话与当前订单不匹配，已拒绝同步。",
      };
    }

    const resolved = resolveResyncTargetState({
      status: session.status,
      payment_status: session.payment_status,
    });

    if (resolved.kind === "noop") {
      await writeRedirectLog({
        orderId: order.id,
        landingDomainId: order.landingDomainId,
        eventType: "admin.payment_resync.noop",
        result: LogResult.INFO,
        status: order.status,
        message: resolved.message,
        metadata: {
          stripeSessionId: session.id,
          sessionStatus: session.status,
          paymentStatus: session.payment_status,
        },
      });

      if (actorId) {
        await writeAuditLog({
          actorId,
          eventType: "admin.order_payment_resync",
          result: LogResult.INFO,
          targetType: "order",
          targetId: order.id,
          metadata: {
            reason: resolved.reason,
            stripeSessionId: session.id,
            sessionStatus: session.status,
            paymentStatus: session.payment_status,
          },
        });
      }

      return {
        ok: false,
        reason: resolved.reason,
        orderId: order.id,
        stripeSessionId: session.id,
        message: resolved.message,
      };
    }

    await applyPaymentState({
      orderId: order.id,
      landingDomainId: order.landingDomainId,
      stripeSessionId: session.id,
      stripePaymentIntentId:
        typeof session.payment_intent === "string" ? session.payment_intent : null,
      orderStatus: resolved.orderStatus,
      paymentStatus: resolved.paymentStatus,
      eventType: "admin.payment_resync.applied",
      metadata: {
        resultStatus: resolved.resultStatus,
        sessionStatus: session.status,
        paymentStatus: session.payment_status,
      },
    });

    if (actorId) {
      await writeAuditLog({
        actorId,
        eventType: "admin.order_payment_resync",
        result: LogResult.SUCCESS,
        targetType: "order",
        targetId: order.id,
        metadata: {
          stripeSessionId: session.id,
          orderStatus: resolved.orderStatus,
          paymentStatus: resolved.paymentStatus,
          resultStatus: resolved.resultStatus,
        },
      });
    }

    return {
      ok: true,
      message: `已根据 Stripe 最新状态同步订单，当前状态 ${resolved.orderStatus}。`,
      orderId: order.id,
      status: resolved.orderStatus,
      paymentStatus: resolved.paymentStatus,
      stripeSessionId: session.id,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stripe 状态同步失败。";

    await writeRedirectLog({
      orderId: order.id,
      landingDomainId: order.landingDomainId,
      eventType: "admin.payment_resync.failed",
      result: LogResult.FAILURE,
      status: order.status,
      message,
      metadata: {
        stripeSessionId: latestPaymentSession.stripeSessionId,
      },
    });

    if (actorId) {
      await writeAuditLog({
        actorId,
        eventType: "admin.order_payment_resync",
        result: LogResult.FAILURE,
        targetType: "order",
        targetId: order.id,
        metadata: {
          stripeSessionId: latestPaymentSession.stripeSessionId,
          message,
        },
      });
    }

    return {
      ok: false,
      reason: "LOOKUP_FAILED",
      orderId: order.id,
      stripeSessionId: latestPaymentSession.stripeSessionId,
      message,
    };
  }
}
