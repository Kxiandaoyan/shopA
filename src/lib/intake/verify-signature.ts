import crypto from "node:crypto";
import type { IntakeOrderPayload } from "@/lib/intake/schema";

export function buildSignaturePayload(payload: Omit<IntakeOrderPayload, "signature">) {
  return JSON.stringify(payload);
}

export function createIntakeSignature(
  payload: Omit<IntakeOrderPayload, "signature">,
  secret: string,
) {
  return crypto
    .createHmac("sha256", secret)
    .update(buildSignaturePayload(payload))
    .digest("hex");
}

export function verifyIntakeSignature(payload: IntakeOrderPayload, secret: string) {
  const { signature, ...unsignedPayload } = payload;
  const expected = createIntakeSignature(unsignedPayload, secret);

  if (signature.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
