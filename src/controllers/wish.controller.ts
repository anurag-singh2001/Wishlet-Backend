import type { FastifyRequest, FastifyReply } from "fastify";
import { wishService } from "../services/wish.service.js";
import { CreateWishSchema, GetWishParamsSchema } from "../schemas/wish.schema.js";
import { env } from "../config/env.js";

export class WishController {
  async getRootInfo(_request: FastifyRequest, reply: FastifyReply) {
    return reply.send({
      message: "Wishlet Wishes API Endpoint",
      usage: {
        createWish: "POST /api/v1/wishes",
        getWish: "GET /api/v1/wishes/:slug",
        deleteWish: "DELETE /api/v1/wishes/:slug",
      },
    });
  }

  async createWish(request: FastifyRequest, reply: FastifyReply) {
    // Validate request body
    const data = CreateWishSchema.parse(request.body);
    
    // Call service
    const wish = await wishService.createWish(data);
    
    // Dynamically resolve frontend base URL from request origin, referer, or env
    let baseUrl = env.FRONTEND_URL && !env.FRONTEND_URL.includes("localhost") ? env.FRONTEND_URL : "";

    if (!baseUrl || baseUrl === "*") {
      const originHeader = request.headers.origin;
      const refererHeader = request.headers.referer;

      if (originHeader && !originHeader.includes("localhost")) {
        baseUrl = originHeader;
      } else if (refererHeader) {
        try {
          baseUrl = new URL(refererHeader).origin;
        } catch {
          // ignore invalid referer URL
        }
      }
    }

    if (!baseUrl) {
      baseUrl = process.env.FRONTEND_URL || env.CORS_ORIGIN || "http://localhost:3000";
    }

    // Strip any trailing slashes
    baseUrl = baseUrl.replace(/\/+$/, "");
    
    // Return created response with dynamic public URL
    return reply.status(201).send({
      id: wish.id,
      slug: wish.slug,
      templateId: wish.templateId,
      occasion: wish.occasion,
      content: wish.content,
      createdAt: wish.createdAt,
      url: `${baseUrl}/w/${wish.slug}`
    });
  }

  async getWishBySlug(request: FastifyRequest, reply: FastifyReply) {
    // Validate path params
    const { slug } = GetWishParamsSchema.parse(request.params);
    
    // Fetch wish
    const wish = await wishService.getWishBySlug(slug);
    
    return reply.send({
      slug: wish.slug,
      templateId: wish.templateId,
      occasion: wish.occasion,
      content: wish.content,
      createdAt: wish.createdAt
    });
  }

  async deleteWish(request: FastifyRequest, reply: FastifyReply) {
    const { slug: id } = GetWishParamsSchema.parse(request.params);
    await wishService.deleteWish(id);

    return reply.send({
      success: true,
      message: "Wish and associated media assets deleted successfully",
    });
  }
}

export const wishController = new WishController();
