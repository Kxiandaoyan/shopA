import { headers } from "next/headers";
import { LogResult, OrderStatus } from "@prisma/client";
import { buildSignedAffiliateReturnUrl } from "@/lib/affiliate/callback-signature";
import { ResultBridge } from "@/components/storefront/result-bridge";
import { writeRedirectLog } from "@/lib/logging/events";
import { loadOrderContextByToken } from "@/lib/orders/order-context";

type ResultPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export default async function PaymentFailurePage({ searchParams }: ResultPageProps) {
  const headerStore = await headers();
  const host = headerStore.get("host") ?? "localhost:3000";
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  const order = token ? await loadOrderContextByToken(token, host) : null;
  const requestUrl = `https://${host}/payment/failure?token=${token}`;

  let returnUrl: string | null = null;
  let title = "Payment failed";
  let message = "The failure result has been captured and the buyer is being returned to the affiliate site.";

  if (order) {
    if (order.status === OrderStatus.FAILED || order.status === OrderStatus.EXPIRED) {
      returnUrl = await buildSignedAffiliateReturnUrl({
        token,
        host,
        status: order.status === OrderStatus.EXPIRED ? "expired" : "failed",
      });

      if (!returnUrl) {
        message = "The failed payment state is recorded on this storefront. The buyer remains on this site because no external callback URL is configured.";
      }
    } else {
      await writeRedirectLog({
        orderId: order.orderId,
        landingDomainId: order.landingDomainId,
        eventType: "payment.bridge.failure_unverified",
        result: LogResult.FAILURE,
        status: order.status,
        requestUrl,
        message: "Failure bridge request was received before a verified failed payment state existed.",
      });
      title = "Payment failure could not be verified";
      message = "The failure result is not yet confirmed by the payment system.";
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
