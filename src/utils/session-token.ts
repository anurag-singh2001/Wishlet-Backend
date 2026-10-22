import { SignJWT, jwtVerify } from "jose";
import { env } from "../config/env.js";

const key = (): Uint8Array => new TextEncoder().encode(env.JWT_SECRET);

export async function signSessionToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${env.AUTH_TOKEN_DAYS}d`)
    .sign(key());
}

/** Returns the user id, or null for any invalid/expired token. */
export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return typeof payload.sub === "string" && payload.sub ? payload.sub : null;
  } catch {
    return null;
  }
}
