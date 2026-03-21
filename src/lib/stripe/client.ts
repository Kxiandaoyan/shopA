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
  const stripeAccount = await db.stripeAccount.findUnique({
    where: { landingDomainId },
  });

  if (!stripeAccount || !stripeAccount.isActive) {
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
