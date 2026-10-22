import crypto from "node:crypto";

export function hashDeleteToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function isValidDeleteToken(token: string, storedHash: string | null): boolean {
  if (!storedHash) return false;
  const given = Buffer.from(hashDeleteToken(token), "hex");
  const stored = Buffer.from(storedHash, "hex");
  return given.length === stored.length && crypto.timingSafeEqual(given, stored);
}
