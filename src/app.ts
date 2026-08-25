import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { env } from "./config/env.js";
import { healthRoutes } from "./routes/health.routes.js";
import { wishRoutes } from "./routes/wish.routes.js";
import { templateRoutes } from "./routes/template.routes.js";
import { uploadRoutes } from "./routes/upload.routes.js";
import { setupErrorHandler } from "./plugins/error-handler.js";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "production" ? "info" : "debug",
    },
  });

  // --- Setup Error Handler ---
  setupErrorHandler(app);

  // --- Plugins ---
  await app.register(cors, {
    origin: env.CORS_ORIGIN.includes(",") 
      ? env.CORS_ORIGIN.split(",").map(o => o.trim()) 
      : env.CORS_ORIGIN,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  });
  await app.register(multipart);

  // --- Routes ---
  await app.register(healthRoutes, { prefix: "/" });
  await app.register(wishRoutes, { prefix: "/api/v1/wishes" });
  await app.register(templateRoutes, { prefix: "/api/v1/templates" });
  await app.register(uploadRoutes, { prefix: "/api/v1/uploads" });

  return app;
}
