import { db } from "@/lib/db";
import { resolveStorefrontTemplate, type StorefrontTemplateCode } from "@/lib/storefront/template-resolver";

export type DomainContext = {
  domainId: string | null;
  host: string;
  template: StorefrontTemplateCode;
  hasStripeAccount: boolean;
  affiliateName: string | null;
};

export async function loadDomainContext(host: string): Promise<DomainContext> {
  try {
    const landingDomain = await db.landingDomain.findUnique({
      where: { hostname: host },
      include: {
        template: true,
        stripeAccount: true,
        affiliate: true,
      },
    });

    return {
      domainId: landingDomain?.id ?? null,
      host,
      template: resolveStorefrontTemplate(landingDomain?.template?.templateCode),
      hasStripeAccount: Boolean(landingDomain?.stripeAccount?.isActive),
      affiliateName: landingDomain?.affiliate?.name ?? null,
    };
  } catch {
    return {
      domainId: null,
      host,
      template: "A",
      hasStripeAccount: false,
      affiliateName: null,
    };
  }
}
