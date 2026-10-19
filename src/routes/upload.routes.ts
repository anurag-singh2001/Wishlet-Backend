import type { FastifyPluginAsync } from "fastify";
import {
  getUploadSignatureHandler,
  uploadImageHandler,
} from "../controllers/upload.controller.js";

export const uploadRoutes: FastifyPluginAsync = async (fastify) => {
  const opts = { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } };
  fastify.post("/signature", opts, getUploadSignatureHandler);
  fastify.get("/signature", opts, getUploadSignatureHandler);
  fastify.post("/image", opts, uploadImageHandler);
};
