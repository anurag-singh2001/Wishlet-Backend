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

  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (env.CORS_ORIGIN === "*") return cb(null, true);

      const allowedOrigins = env.CORS_ORIGIN
        .split(",")
        .map((o) => o.trim().replace(/\/+$/, ""))
        .filter(Boolean);

      const cleanOrigin = origin.replace(/\/+$/, "");

      if (allowedOrigins.includes(cleanOrigin) || allowedOrigins.includes("*")) {
        return cb(null, true);
      }

      if (env.CORS_ORIGIN.includes("vercel.app") && cleanOrigin.endsWith(".vercel.app")) {
        return cb(null, true);
      }

      cb(new Error(`Not allowed by CORS: ${origin}`), false);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
    credentials: true,
  });
  await app.register(multipart);

  // --- Routes ---
  await app.register(healthRoutes, { prefix: "/" });
  await app.register(wishRoutes, { prefix: "/api/v1/wishes" });
  await app.register(templateRoutes, { prefix: "/api/v1/templates" });
  await app.register(uploadRoutes, { prefix: "/api/v1/uploads" });

  return app;
}
