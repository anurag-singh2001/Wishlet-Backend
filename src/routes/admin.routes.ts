import type { FastifyInstance } from "fastify";
import { adminController as c } from "../controllers/admin.controller.js";

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  const upload = { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } };
  app.get("/config", (req, rep) => c.getConfig(req, rep));
  app.put("/config/branding", (req, rep) => c.putBranding(req, rep));
  app.put("/config/catalog", (req, rep) => c.putCatalog(req, rep));
  app.post("/logo", upload, (req, rep) => c.uploadLogo(req, rep));
  app.get("/stats", (req, rep) => c.getStats(req, rep));
  app.get("/wishes", (req, rep) => c.listWishes(req, rep));
  app.delete("/wishes/:id", (req, rep) => c.deleteWish(req, rep));
  app.post("/users/:id/block", (req, rep) => c.blockUser(req, rep));
  app.post("/users/:id/unblock", (req, rep) => c.unblockUser(req, rep));
}
