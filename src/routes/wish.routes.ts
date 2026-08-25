import type { FastifyInstance } from "fastify";
import { wishController } from "../controllers/wish.controller.js";

export async function wishRoutes(app: FastifyInstance) {
  app.get("/", wishController.getRootInfo);
  app.post("/", wishController.createWish);
  app.get("/:slug", wishController.getWishBySlug);
  app.delete("/:slug", wishController.deleteWish);
}
