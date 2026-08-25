import type { FastifyInstance } from "fastify";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async (_request, _reply) => {
    return {
      status: "ok",
      service: "wishlet-api",
      timestamp: new Date().toISOString(),
    };
  });
}
