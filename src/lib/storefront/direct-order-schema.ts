import { z } from "zod";

const buyerSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email(),
  phone: z.string().trim().min(5).max(40),
  country: z.string().trim().min(2).max(80),
  state: z.string().trim().min(1).max(80),
  city: z.string().trim().min(1).max(80),
  address1: z.string().trim().min(5).max(200),
  address2: z.string().trim().max(200).optional().default(""),
  postalCode: z.string().trim().min(3).max(20),
});

export const directOrderSchema = z.object({
  productId: z.string().trim().min(1),
  quantity: z.number().int().min(1).max(10),
  buyer: buyerSchema,
});

export type DirectOrderPayload = z.infer<typeof directOrderSchema>;
