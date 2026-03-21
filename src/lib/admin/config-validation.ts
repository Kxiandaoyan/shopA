import { db } from "@/lib/db";

export async function validateActiveAffiliate(affiliateId: string | null | undefined) {
  if (!affiliateId) {
    return {
      ok: true as const,
      affiliate: null,
    };
  }

  const affiliate = await db.affiliate.findUnique({
    where: { id: affiliateId },
    select: {
      id: true,
      code: true,
      name: true,
      isActive: true,
    },
  });

  if (!affiliate) {
    return {
      ok: false as const,
      message: "所选分销商不存在。",
    };
  }

  if (!affiliate.isActive) {
    return {
      ok: false as const,
      message: "所选分销商已停用，不能继续绑定。",
    };
  }

  return {
    ok: true as const,
    affiliate,
  };
}

export async function validateActiveLandingDomain(landingDomainId: string) {
  const domain = await db.landingDomain.findUnique({
    where: { id: landingDomainId },
    select: {
      id: true,
      hostname: true,
      label: true,
      isActive: true,
    },
  });

  if (!domain) {
    return {
      ok: false as const,
      message: "所选落地域名不存在。",
    };
  }

  if (!domain.isActive) {
    return {
      ok: false as const,
      message: "所选落地域名已停用，不能绑定 Stripe。",
    };
  }

  return {
    ok: true as const,
    domain,
  };
}
