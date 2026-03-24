import { db } from "@/lib/db";
import { resolveStorefrontTemplate, type StorefrontTemplateCode } from "@/lib/storefront/template-resolver";

export type DomainContext = {
  domainId: string | null;
  host: string;
  template: StorefrontTemplateCode;
  hasStripeAccount: boolean;
  affiliateNames: string[];
};

export async function loadDomainContext(host: string): Promise<DomainContext> {
  try {
    const landingDomain = await db.landingDomain.findUnique({
      where: { hostname: host },
      include: {
        template: true,
        stripeAccount: true,
        affiliateAssignments: {
          include: {
            affiliate: true,
          },
        },
      },
    });

    const affiliateNames = landingDomain?.affiliateAssignments
      .map((a) => a.affiliate.name)
      .filter(Boolean) ?? [];

    return {
      domainId: landingDomain?.id ?? null,
      host,
      template: resolveStorefrontTemplate(landingDomain?.template?.templateCode),
      hasStripeAccount: Boolean(landingDomain?.stripeAccount?.isActive),
      affiliateNames,
    };
  } catch {
    return {
      domainId: null,
      host,
      template: "A",
      hasStripeAccount: false,
      affiliateNames: [],
    };
  }
}
