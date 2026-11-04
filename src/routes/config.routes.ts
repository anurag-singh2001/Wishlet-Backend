import type { FastifyInstance } from "fastify";
import { configController } from "../controllers/config.controller.js";

export async function configRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", configController.getPublicConfig);
}
