import type { FastifyRequest, FastifyReply } from "fastify";
import { storageService } from "../services/storage.service.js";
import { ApiError } from "../plugins/error-handler.js";

export async function getUploadSignatureHandler(
  _request: FastifyRequest,
  reply: FastifyReply
) {
  const signatureData = storageService.getUploadSignature();
  return reply.send(signatureData);
}

export async function uploadImageHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const data = await request.file({
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
  });

  if (!data) {
    throw new ApiError(400, "VALIDATION_ERROR", "No file uploaded.");
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(data.mimetype)) {
    throw new ApiError(
      415,
      "UNSUPPORTED_TYPE",
      "File type not allowed. Please upload JPEG, PNG, or WebP."
    );
  }

  const buffer = await data.toBuffer();
  
  const result = await storageService.uploadImage(buffer, data.filename, data.mimetype);

  return reply.status(201).send({
    url: result.url,
    publicId: result.publicId,
  });
}
