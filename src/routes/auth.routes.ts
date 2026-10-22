import type { FastifyInstance } from "fastify";
import { authController } from "../controllers/auth.controller.js";

const LIMIT_10 = { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } };

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/google", LIMIT_10, authController.google);
  app.get("/me", authController.me);
  app.get("/me/wishes", authController.myWishes);
  app.post("/me/wishes/claim", LIMIT_10, authController.claim);
}
