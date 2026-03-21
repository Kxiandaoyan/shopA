import { z } from "zod";

export const intakeOrderSchema = z.object({
  affiliateCode: z.string().min(1),
  externalOrderId: z.string().min(1),
  timestamp: z.number().int(),
  nonce: z.string().min(8),
  buyer: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.email(),
    phone: z.string().min(1),
    country: z.string().min(1),
    state: z.string().min(1),
    city: z.string().min(1),
    address1: z.string().min(1),
    address2: z.string().optional().nullable(),
    postalCode: z.string().min(1),
  }),
  totalAmount: z.number().positive(),
  currency: z.string().length(3),
  returnUrl: z.url().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1).optional(),
        name: z.string().min(1).optional(),
        quantity: z.number().int().positive(),
        unitPrice: z.number().positive(),
      }),
    )
    .min(1),
  signature: z.string().min(16),
});

export type IntakeOrderPayload = z.infer<typeof intakeOrderSchema>;
