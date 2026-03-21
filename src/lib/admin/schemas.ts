import { z } from "zod";

export const affiliateAdminSchema = z.object({
  code: z.string().trim().min(2),
  name: z.string().trim().min(2),
  intakeSecret: z.string().trim().min(12).optional().or(z.literal("")),
  callbackSecret: z.string().trim().min(12).optional().or(z.literal("")),
});

export const domainAdminSchema = z.object({
  hostname: z.string().trim().min(3),
  label: z.string().trim().min(2),
  affiliateId: z.string().trim().optional().nullable(),
  templateCode: z.enum(["A", "B", "C"]).optional().nullable(),
  affiliateCheckoutNameMode: z
    .enum(["FIXED", "CATALOG_RANDOM", "SOURCE_PRODUCT"])
    .default("CATALOG_RANDOM"),
  affiliateCheckoutFixedName: z.string().trim().max(120).optional().nullable(),
  isActive: z.boolean().default(true),
}).superRefine((value, ctx) => {
  if (
    value.affiliateCheckoutNameMode === "FIXED" &&
    (!value.affiliateCheckoutFixedName || value.affiliateCheckoutFixedName.trim().length < 2)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["affiliateCheckoutFixedName"],
      message: "固定名称至少需要 2 个字符。",
    });
  }
});

export const returnUrlAdminSchema = z.object({
  affiliateId: z.string().trim().min(1),
  url: z.url(),
  isActive: z.boolean().default(true),
});

export const webhookEndpointAdminSchema = z.object({
  affiliateId: z.string().trim().min(1),
  url: z.url(),
  isActive: z.boolean().default(true),
});

export const stripeAdminSchema = z.object({
  landingDomainId: z.string().trim().min(1),
  accountLabel: z.string().trim().min(2),
  publishableKey: z.string().trim().optional().nullable(),
  secretKey: z.string().trim().min(10),
  webhookSecret: z.string().trim().min(10),
  isActive: z.boolean().default(true),
});

export const productAdminSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(2),
  category: z.string().trim().min(2),
  price: z.coerce.number().positive(),
  currency: z.string().trim().min(3).max(3).transform((value) => value.toUpperCase()),
  image: z.string().trim().min(4),
  description: z.string().trim().min(12),
  features: z.array(z.string().trim().min(1)).max(12),
});
