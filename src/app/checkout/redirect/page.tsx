import { headers } from "next/headers";
import { LogResult } from "@prisma/client";
import { redirect } from "next/navigation";
import { loadOrderContextByToken } from "@/lib/orders/order-context";
import { writeRedirectLog } from "@/lib/logging/events";
import { db } from "@/lib/db";
import { createHostedCheckoutSession } from "@/lib/stripe/checkout";

type CheckoutRedirectPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export default async function CheckoutRedirectPage({
  searchParams,
}: CheckoutRedirectPageProps) {
  const headerStore = await headers();
  const host = headerStore.get("host") ?? "localhost:3000";
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  const order = token ? await loadOrderContextByToken(token, host) : null;

  let stripeConfigured = false;
  let state: "invalid" | "ready" | "not_configured" | "already_paid" | "error" = order
    ? "ready"
    : "invalid";

  if (order) {
    try {
      const landingDomain = await db.landingDomain.findUnique({
        where: { id: order.landingDomainId },
        include: { stripeAccount: true },
      });

      stripeConfigured = Boolean(landingDomain?.stripeAccount?.isActive);
      await writeRedirectLog({
        orderId: order.orderId,
        landingDomainId: order.landingDomainId,
        eventType: stripeConfigured ? "checkout.redirect_ready" : "checkout.redirect_blocked",
        result: stripeConfigured ? LogResult.SUCCESS : LogResult.INFO,
        status: order.status,
        requestUrl: `https://${host}/checkout/redirect?token=${token}`,
        metadata: {
          stripeConfigured,
        },
        });

      if (stripeConfigured) {
        const protocol = headerStore.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
        const checkout = await createHostedCheckoutSession({
          order,
          host,
          protocol,
        });

        if (checkout.ok && checkout.checkoutUrl) {
          redirect(checkout.checkoutUrl);
        }

        state = checkout.reason === "ORDER_ALREADY_PAID" ? "already_paid" : "error";
        await writeRedirectLog({
          orderId: order.orderId,
          landingDomainId: order.landingDomainId,
          eventType: "checkout.redirect_failed",
          result: LogResult.FAILURE,
          status: order.status,
          requestUrl: `https://${host}/checkout/redirect?token=${token}`,
          message:
            checkout.reason === "ORDER_ALREADY_PAID"
              ? "Checkout redirect skipped because the order is already paid."
              : "Checkout redirect failed because Stripe is not configured.",
          metadata: {
            reason: checkout.reason,
          },
        });
      } else {
        state = "not_configured";
      }
    } catch (error) {
      state = "error";
      await writeRedirectLog({
        orderId: order.orderId,
        landingDomainId: order.landingDomainId,
        eventType: "checkout.redirect_exception",
        result: LogResult.FAILURE,
        status: order.status,
        requestUrl: `https://${host}/checkout/redirect?token=${token}`,
        message: error instanceof Error ? error.message : "Checkout redirect failed.",
      });
    }
  }

  return (
    <main className="min-h-screen bg-[#0f1f1b] px-6 py-12 text-[#eff5ef] lg:px-10">
      <div className="mx-auto max-w-4xl rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <div className="text-xs uppercase tracking-[0.24em] text-[#97b0a1]">Checkout bridge</div>
        <h1 className="mt-4 text-4xl">Secure checkout is being prepared.</h1>
        {!order ? (
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#c7d5ce]">
            The token is missing or invalid for this domain. Return to the originating source and generate a fresh payment link.
          </p>
        ) : stripeConfigured && state === "ready" ? (
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#c7d5ce]">
            The landing step is complete and the system is redirecting the buyer into the Stripe hosted checkout flow.
          </p>
        ) : state === "already_paid" ? (
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#c7d5ce]">
            This order has already been paid. Do not create a second payment for the same order.
          </p>
        ) : state === "error" ? (
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#c7d5ce]">
            A temporary problem prevented the checkout redirect. Check the admin logs and retry from a fresh intake link if needed.
          </p>
        ) : (
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#c7d5ce]">
            This domain does not yet have an active Stripe account binding. Configure it in the admin backend before enabling live traffic.
          </p>
        )}
        <div className="mt-8 rounded-[1.5rem] bg-white/5 p-5 text-sm text-[#c7d5ce]">
          For security and compliance, this page always completes the landing-domain step before Stripe checkout starts.
        </div>
      </div>
    </main>
  );
}
