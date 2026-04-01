import Stripe from "stripe";
import { db } from "@/lib/db";
import { decryptValue } from "@/lib/security/encryption";

export type StripeBinding = {
  stripeAccountId: string;
  accountLabel: string;
  secretKey: string;
  webhookSecret: string;
  landingDomainId: string;
};

export async function loadStripeBindingByDomainId(landingDomainId: string): Promise<StripeBinding | null> {
  const domain = await db.landingDomain.findUnique({
    where: { id: landingDomainId },
    include: { stripeAccount: true },
  });

  if (!domain?.stripeAccount || !domain.stripeAccount.isActive) {
    return null;
  }

  const stripeAccount = domain.stripeAccount;

  // 如果必要的密钥未配置，返回 null
  if (!stripeAccount.secretKeyEncrypted || !stripeAccount.webhookSecret) {
    return null;
  }

  return {
    stripeAccountId: stripeAccount.id,
    accountLabel: stripeAccount.accountLabel,
    secretKey: decryptValue(stripeAccount.secretKeyEncrypted),
    webhookSecret: decryptValue(stripeAccount.webhookSecret),
    landingDomainId,
  };
}

export function createStripeClient(secretKey: string) {
  return new Stripe(secretKey, {
    apiVersion: "2026-02-25.clover",
  });
}
