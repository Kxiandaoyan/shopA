import crypto from "node:crypto";

const KEYLEN = 64;

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, KEYLEN).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string) {
  const [algorithm, salt, hash] = stored.split(":");

  if (algorithm !== "scrypt" || !salt || !hash) {
    return false;
  }

  const derived = crypto.scryptSync(password, salt, KEYLEN).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(derived, "hex"));
}
