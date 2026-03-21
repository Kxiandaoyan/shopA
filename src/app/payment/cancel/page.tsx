import { headers } from "next/headers";
import { LogResult, PaymentStatus, OrderStatus } from "@prisma/client";
import { buildSignedAffiliateReturnUrl } from "@/lib/affiliate/callback-signature";
import { ResultBridge } from "@/components/storefront/result-bridge";
import { writeRedirectLog } from "@/lib/logging/events";
import { loadOrderContextByToken } from "@/lib/orders/order-context";
import { applyPaymentState } from "@/lib/stripe/order-state";
import { createStripeClient, loadStripeBindingByDomainId } from "@/lib/stripe/client";
import { sessionMatchesOrderContext } from "@/lib/stripe/session-integrity";

type ResultPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export default async function PaymentCancelPage({ searchParams }: ResultPageProps) {
  const headerStore = await headers();
  const host = headerStore.get("host") ?? "localhost:3000";
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  const sessionId = typeof params.session_id === "string" ? params.session_id : "";
  const order = token ? await loadOrderContextByToken(token, host) : null;
  const requestUrl = `https://${host}/payment/cancel?token=${token}&session_id=${sessionId}`;

  let returnUrl: string | null = null;
  let title = "Payment was canceled";
  let message = "The cancel result has been captured and the buyer is being returned to the affiliate site.";

  if (order && sessionId) {
    const stripeBinding = await loadStripeBindingByDomainId(order.landingDomainId);

    if (!stripeBinding) {
      await writeRedirectLog({
        orderId: order.orderId,
        landingDomainId: order.landingDomainId,
        eventType: "payment.bridge.cancel_binding_missing",
        result: LogResult.FAILURE,
        status: order.status,
        requestUrl,
        message: "Stripe binding is missing for the landing domain.",
      });
      title = "Cancellation verification unavailable";
      message = "The cancel result could not be verified on this landing domain.";
    } else {
      try {
        const stripe = createStripeClient(stripeBinding.secretKey);
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (!sessionMatchesOrderContext(session, order)) {
          await writeRedirectLog({
            orderId: order.orderId,
            landingDomainId: order.landingDomainId,
            eventType: "payment.bridge.cancel_mismatch",
            result: LogResult.FAILURE,
            status: order.status,
            requestUrl,
            message: "Stripe session metadata does not match the current order context.",
            metadata: {
              stripeSessionId: session.id,
              sessionOrderId: session.metadata?.orderId ?? null,
              sessionLandingDomainId: session.metadata?.landingDomainId ?? null,
              sessionToken: session.metadata?.token ?? null,
            },
          });
          title = "Cancellation verification failed";
          message = "The cancel result could not be matched to the current order.";
        } else {
          await applyPaymentState({
            orderId: order.orderId,
            landingDomainId: order.landingDomainId,
            stripeSessionId: session.id,
            orderStatus: OrderStatus.CANCELED,
            paymentStatus: PaymentStatus.CANCELED,
            eventType: "payment.bridge.canceled",
            requestUrl,
            metadata: {
              resultStatus: "canceled",
            },
          });

          returnUrl = await buildSignedAffiliateReturnUrl({
            token,
            host,
            status: "canceled",
          });

          if (!returnUrl) {
            message = "The cancellation was recorded on this storefront. No external site callback is configured for this order.";
          }
        }
      } catch (error) {
        await writeRedirectLog({
          orderId: order.orderId,
          landingDomainId: order.landingDomainId,
          eventType: "payment.bridge.cancel_lookup_failed",
          result: LogResult.FAILURE,
          status: order.status,
          requestUrl,
          message: error instanceof Error ? error.message : "Stripe session lookup failed.",
          metadata: {
            stripeSessionId: sessionId,
          },
        });
        title = "Cancellation verification failed";
        message = "The cancel result could not be verified with Stripe.";
      }
    }
  } else if (order) {
    await writeRedirectLog({
      orderId: order.orderId,
      landingDomainId: order.landingDomainId,
      eventType: "payment.bridge.cancel_missing_session",
      result: LogResult.FAILURE,
      status: order.status,
      requestUrl,
      message: "Cancel bridge request is missing Stripe session_id.",
    });
    title = "Cancellation verification failed";
    message = "The cancel result is missing the required Stripe session reference.";
  }

  return (
    <ResultBridge
      title={title}
      message={message}
      returnUrl={returnUrl}
    />
  );
}
