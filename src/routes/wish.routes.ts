import type { FastifyInstance } from "fastify";
import { wishController } from "../controllers/wish.controller.js";

export async function wishRoutes(app: FastifyInstance) {
  app.get("/", wishController.getRootInfo);
  app.post(
    "/",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    wishController.createWish,
  );
  app.get("/:slug", wishController.getWishBySlug);
  app.post(
    "/:slug/view",
    { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    wishController.recordView,
  );
  app.post(
    "/:slug/reactions",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    wishController.react,
  );
  app.patch("/:slug/settings", wishController.updateSettings);
  app.get("/:slug/stats", wishController.getWishStats);
  app.delete("/:slug", wishController.deleteWish);
}
