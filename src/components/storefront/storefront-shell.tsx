import { TemplateA } from "@/components/storefront/template-a";
import { AutoForward } from "@/components/storefront/auto-forward";
import { DirectCheckoutPanel } from "@/components/storefront/direct-checkout-panel";
import { LandingStatus } from "@/components/storefront/landing-status";
import { TemplateB } from "@/components/storefront/template-b";
import { TemplateC } from "@/components/storefront/template-c";
import type { LandingOrderContext } from "@/lib/orders/order-context";
import type { CatalogProduct } from "@/lib/products/catalog";
import { getTemplateTheme } from "@/lib/storefront/theme-tokens";
import type { StorefrontTemplateCode } from "@/lib/storefront/template-resolver";

type StorefrontShellProps = {
  template: StorefrontTemplateCode;
  products: CatalogProduct[];
  host: string;
  domainId?: string | null;
  token?: string;
  orderContext?: LandingOrderContext | null;
  canAutoForward?: boolean;
  hasStripeAccount?: boolean;
};

export function StorefrontShell({
  template,
  products,
  host,
  domainId = null,
  token,
  orderContext = null,
  canAutoForward = false,
  hasStripeAccount = false,
}: StorefrontShellProps) {
  const theme = getTemplateTheme(template);
  const directCheckoutEnabled = Boolean(domainId);
  const directCheckoutReason = !domainId
    ? "This domain is not configured in the admin backend yet."
    : undefined;
  const hideCatalogForImportedOrder = orderContext?.orderMode === "affiliate_intake";

  if (hideCatalogForImportedOrder) {
    return (
      <main className={`min-h-screen ${theme.shellClassName}`}>
        {canAutoForward && token ? <AutoForward href={`/checkout/redirect?token=${token}`} /> : null}
        <LandingStatus order={orderContext} hasStripeAccount={hasStripeAccount} />
      </main>
    );
  }

  return (
    <main className={`min-h-screen ${theme.shellClassName}`}>
      {canAutoForward && token ? <AutoForward href={`/checkout/redirect?token=${token}`} /> : null}
      <section className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-6 py-6 lg:px-10">
        <div>
          <div className="text-xs uppercase tracking-[0.24em] opacity-60">{theme.eyebrow}</div>
          <h1 className="mt-3 max-w-3xl text-4xl leading-tight md:text-5xl">{theme.title}</h1>
          <p className="mt-3 max-w-2xl text-base leading-8 opacity-70">{theme.subtitle}</p>
        </div>
      </section>
      {token ? <LandingStatus order={orderContext} hasStripeAccount={hasStripeAccount} /> : null}
      {template === "B"
        ? <TemplateB products={products} />
        : template === "C"
          ? <TemplateC products={products} />
          : <TemplateA products={products} />}
      {!orderContext ? (
        <DirectCheckoutPanel
          products={products}
          enabled={directCheckoutEnabled}
          reason={directCheckoutReason}
        />
      ) : null}
      <section className="mx-auto max-w-6xl px-6 pb-12 text-sm opacity-70 lg:px-10">
        {"Direct purchases create an order on this storefront first. Affiliate traffic keeps the existing landing validation and server-side redirect flow."}
      </section>
    </main>
  );
}
