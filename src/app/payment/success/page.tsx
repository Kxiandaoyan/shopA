import { headers } from "next/headers";
import { LogResult } from "@prisma/client";
import { ResultBridge } from "@/components/storefront/result-bridge";
import { buildSignedAffiliateReturnUrl } from "@/lib/affiliate/callback-signature";
import { writeRedirectLog } from "@/lib/logging/events";
import { loadOrderContextByToken } from "@/lib/orders/order-context";
import { loadStripeBindingByDomainId, createStripeClient } from "@/lib/stripe/client";
import { applyPaymentState } from "@/lib/stripe/order-state";
import { sessionMatchesOrderContext } from "@/lib/stripe/session-integrity";
import { mapCheckoutSessionToState } from "@/lib/stripe/session-status";

type ResultPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export default async function PaymentSuccessPage({ searchParams }: ResultPageProps) {
  const headerStore = await headers();
  const host = headerStore.get("host") ?? "localhost:3000";
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  const sessionId = typeof params.session_id === "string" ? params.session_id : "";
  const order = token ? await loadOrderContextByToken(token, host) : null;
  const requestUrl = `https://${host}/payment/success?token=${token}&session_id=${sessionId}`;

  let returnUrl: string | null = null;
  let title = "Payment result received";
  let message =
    "The order result has been captured on the landing domain and the buyer is being returned to the affiliate site.";

  if (order && sessionId) {
    const stripeBinding = await loadStripeBindingByDomainId(order.landingDomainId);

    if (!stripeBinding) {
      await writeRedirectLog({
        orderId: order.orderId,
        landingDomainId: order.landingDomainId,
        eventType: "payment.bridge.success_binding_missing",
        result: LogResult.FAILURE,
        status: order.status,
        requestUrl,
        message: "Stripe binding is missing for the landing domain.",
      });
      title = "Payment verification unavailable";
      message = "The payment result could not be verified on this landing domain.";
    } else {
      try {
        const stripe = createStripeClient(stripeBinding.secretKey);
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (!sessionMatchesOrderContext(session, order)) {
          await writeRedirectLog({
            orderId: order.orderId,
            landingDomainId: order.landingDomainId,
            eventType: "payment.bridge.success_mismatch",
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
          title = "Payment verification failed";
          message = "The payment result could not be matched to the current order.";
        } else {
          const state = mapCheckoutSessionToState(session);

          await applyPaymentState({
            orderId: order.orderId,
            landingDomainId: order.landingDomainId,
            stripeSessionId: session.id,
            stripePaymentIntentId:
              typeof session.payment_intent === "string" ? session.payment_intent : null,
            orderStatus: state.orderStatus,
            paymentStatus: state.paymentStatus,
            eventType: "payment.bridge.success",
            requestUrl,
            metadata: {
              resolvedStatus: state.resultStatus,
            },
          });

          returnUrl = await buildSignedAffiliateReturnUrl({
            token,
            host,
            status: state.resultStatus,
          });

          if (!returnUrl) {
            title = "Payment completed";
            message = "The payment was verified and the order is now recorded on this storefront.";
          }
        }
      } catch (error) {
        await writeRedirectLog({
          orderId: order.orderId,
          landingDomainId: order.landingDomainId,
          eventType: "payment.bridge.success_lookup_failed",
          result: LogResult.FAILURE,
          status: order.status,
          requestUrl,
          message: error instanceof Error ? error.message : "Stripe session lookup failed.",
          metadata: {
            stripeSessionId: sessionId,
          },
        });
        title = "Payment verification failed";
        message = "The payment result could not be verified with Stripe.";
      }
    }
  }

  return (
    <ResultBridge
      title={title}
      message={message}
      returnUrl={returnUrl}
    />
  );
}
