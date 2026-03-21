import crypto from "node:crypto";
import { env } from "@/lib/env";

function getKeyMaterial() {
  return crypto
    .createHash("sha256")
    .update(env.STRIPE_SECRET_ENCRYPTION_KEY)
    .digest();
}

export function encryptValue(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKeyMaterial(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `enc:${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

export function decryptValue(value: string) {
  if (!value.startsWith("enc:")) {
    return value;
  }

  const [, ivRaw, tagRaw, encryptedRaw] = value.split(":");

  if (!ivRaw || !tagRaw || !encryptedRaw) {
    throw new Error("Invalid encrypted payload format");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getKeyMaterial(),
    Buffer.from(ivRaw, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, "base64url")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
