import type { FastifyPluginAsync } from "fastify";
import {
  getUploadSignatureHandler,
  uploadImageHandler,
} from "../controllers/upload.controller.js";

export const uploadRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/signature", getUploadSignatureHandler);
  fastify.get("/signature", getUploadSignatureHandler);
  fastify.post("/image", uploadImageHandler);
};
