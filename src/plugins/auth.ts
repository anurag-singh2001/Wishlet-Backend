import type { FastifyInstance, FastifyRequest } from "fastify";
import { ApiError } from "./error-handler.js";
import { verifySessionToken } from "../utils/session-token.js";

declare module "fastify" {
  interface FastifyRequest {
    user: { id: string } | null;
  }
}

/** Optional auth: a valid Bearer token sets request.user; anything else leaves it null. */
export async function registerAuth(app: FastifyInstance): Promise<void> {
  app.decorateRequest("user", null);
  app.addHook("onRequest", async (request) => {
    const header = request.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) return;
    const id = await verifySessionToken(header.slice(7).trim());
    if (id) request.user = { id };
  });
}

export function requireUser(request: FastifyRequest): { id: string } {
  if (!request.user) throw new ApiError(401, "UNAUTHORIZED", "Sign in required.");
  return request.user;
}
