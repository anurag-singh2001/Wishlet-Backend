import type { FastifyRequest, FastifyReply } from "fastify";
import { wishService, type OwnerAccess } from "../services/wish.service.js";
import {
  CreateWishSchema,
  DeleteWishHeadersSchema,
  GetWishParamsSchema,
  ReactBodySchema,
  SettingsBodySchema,
} from "../schemas/wish.schema.js";
import { mediaService } from "../services/media.service.js";
import { reactionService } from "../services/reaction.service.js";
import { env } from "../config/env.js";
import { resolvePublicBaseUrl } from "../utils/public-url.js";

/** Delete token header and/or session; with neither, the missing header is a 400. */
function ownerAccess(request: FastifyRequest): OwnerAccess {
  const userId = request.user?.id;
  if (userId && request.headers["x-delete-token"] === undefined) return { userId };
  const { "x-delete-token": deleteToken } = DeleteWishHeadersSchema.parse(request.headers);
  return { deleteToken, userId };
}

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
    const wish = await wishService.createWish(data, request.user?.id);

    const baseUrl = resolvePublicBaseUrl({
      frontendUrl: env.FRONTEND_URL,
      corsOrigin: env.CORS_ORIGIN,
      origin: request.headers.origin,
      referer: request.headers.referer,
    });

    // Return created response with dynamic public URL
    return reply.status(201).send({
      id: wish.id,
      slug: wish.slug,
      templateId: wish.templateId,
      occasion: wish.occasion,
      content: mediaService.stripPrivate(wish.content),
      createdAt: wish.createdAt,
      expiresAt: wish.expiresAt,
      deleteToken: wish.deleteToken,
      url: `${baseUrl}/w/${wish.slug}`,
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
      content: mediaService.stripPrivate(wish.content),
      createdAt: wish.createdAt,
      expiresAt: wish.expiresAt,
    });
  }

  async recordView(request: FastifyRequest, reply: FastifyReply) {
    const { slug } = GetWishParamsSchema.parse(request.params);
    const viewCount = await wishService.recordView(slug);
    return reply.send({ viewCount });
  }

  async getWishStats(request: FastifyRequest, reply: FastifyReply) {
    const { slug } = GetWishParamsSchema.parse(request.params);
    const stats = await wishService.getWishStats(slug, ownerAccess(request));
    return reply.send(stats);
  }

  async react(request: FastifyRequest, reply: FastifyReply) {
    const { slug } = GetWishParamsSchema.parse(request.params);
    const { reaction, voterId } = ReactBodySchema.parse(request.body);
    return reply.send(await reactionService.react(slug, reaction, voterId));
  }

  async updateSettings(request: FastifyRequest, reply: FastifyReply) {
    const { slug } = GetWishParamsSchema.parse(request.params);
    const access = ownerAccess(request);
    const { reactionsEnabled } = SettingsBodySchema.parse(request.body);
    return reply.send(await wishService.updateSettings(slug, access, reactionsEnabled));
  }

  async deleteWish(request: FastifyRequest, reply: FastifyReply) {
    const { slug: id } = GetWishParamsSchema.parse(request.params);
    await wishService.deleteWish(id, ownerAccess(request));

    return reply.send({
      success: true,
      message: "Wish and associated media assets deleted successfully",
    });
  }
}

export const wishController = new WishController();
