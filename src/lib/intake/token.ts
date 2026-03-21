import crypto from "node:crypto";
import { env } from "@/lib/env";

export function createOrderToken(seed: string) {
  return crypto
    .createHmac("sha256", env.INTAKE_TOKEN_SECRET)
    .update(seed)
    .digest("hex");
}
