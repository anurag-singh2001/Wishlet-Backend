import type { FastifyInstance } from "fastify";
import { templateController } from "../controllers/template.controller.js";

export async function templateRoutes(app: FastifyInstance) {
  app.get("/", templateController.getTemplates);
}
