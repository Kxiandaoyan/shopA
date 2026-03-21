import { headers } from "next/headers";
import { StorefrontShell } from "@/components/storefront/storefront-shell";
import { getStorefrontProducts } from "@/lib/products/catalog";
import { writeRedirectLog } from "@/lib/logging/events";
import { loadOrderContextByToken } from "@/lib/orders/order-context";
import { markLandingVisited } from "@/lib/orders/mark-landing-visited";
import { loadDomainContext } from "@/lib/storefront/domain-context";

type HomePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: HomePageProps) {
  const headerStore = await headers();
  const host = headerStore.get("host") ?? "localhost:3000";
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : undefined;
  const domainContext = await loadDomainContext(host);
  const orderContext = token ? await loadOrderContextByToken(token, host) : null;
  const products =
    orderContext?.orderMode === "affiliate_intake" ? [] : await getStorefrontProducts();

  if (token && orderContext) {
    await markLandingVisited(orderContext.orderId, orderContext.landingDomainId, `https://${host}/?token=${token}`);
  } else if (token) {
    await writeRedirectLog({
      landingDomainId: domainContext.domainId ?? undefined,
      eventType: "landing.token_rejected",
      requestUrl: `https://${host}/?token=${token}`,
      message: "Token rejected on landing page.",
      metadata: {
        host,
      },
    });
  }

  return (
    <StorefrontShell
      canAutoForward={Boolean(token && orderContext)}
      domainId={domainContext.domainId}
      hasStripeAccount={domainContext.hasStripeAccount}
      host={host}
      orderContext={orderContext}
      products={products}
      template={domainContext.template}
      token={token}
    />
  );
}
