import type { FastifyRequest, FastifyReply } from "fastify";
import { wishService } from "../services/wish.service.js";
import { CreateWishSchema, GetWishParamsSchema } from "../schemas/wish.schema.js";

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
    
    // Return created response with public URL structure
    return reply.status(201).send({
      id: wish.id,
      slug: wish.slug,
      templateId: wish.templateId,
      occasion: wish.occasion,
      content: wish.content,
      createdAt: wish.createdAt,
      url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/w/${wish.slug}`
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
