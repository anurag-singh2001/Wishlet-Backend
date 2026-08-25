import { wishRepository } from "../repositories/wish.repository.js";
import { storageService } from "./storage.service.js";
import type { CreateWishInput } from "../schemas/wish.schema.js";
import { ApiError } from "../plugins/error-handler.js";
import { Prisma } from "@prisma/client";
import crypto from "node:crypto";

export class WishService {
  async createWish(data: CreateWishInput) {
    const MAX_RETRIES = 3;

    // Extract optional photoUrl & photoPublicId from content payload if provided
    const contentObj = (data.content || {}) as Record<string, unknown>;
    const photoUrl = typeof contentObj["photoUrl"] === "string" 
      ? contentObj["photoUrl"] 
      : Array.isArray(contentObj["photos"]) && typeof contentObj["photos"][0] === "string"
        ? contentObj["photos"][0]
        : null;

    const photoPublicId = typeof contentObj["photoPublicId"] === "string"
      ? contentObj["photoPublicId"]
      : null;
    
    for (let i = 0; i < MAX_RETRIES; i++) {
      const randomId = crypto.randomBytes(4).toString("hex");
      const cleanOccasion = data.occasion.toLowerCase().replace(/[^a-z0-9]/g, "");
      const prefix = cleanOccasion.length > 0 ? cleanOccasion : "wish";
      const slug = `${prefix}-${randomId}`;
      
      try {
        const created = await wishRepository.createWish({
          templateId: data.templateId,
          occasion: data.occasion,
          photoUrl,
          photoPublicId,
          content: data.content as Prisma.InputJsonValue,
          slug,
        });
        
        return created;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          if (i === MAX_RETRIES - 1) {
            throw new ApiError(500, "SLUG_GENERATION_FAILED", "Failed to generate a unique URL. Please try again.");
          }
          continue;
        }
        throw error;
      }
    }
    throw new ApiError(500, "SLUG_GENERATION_FAILED", "Failed to generate a unique URL.");
  }

  async getWishBySlug(slug: string) {
    const wish = await wishRepository.findWishBySlug(slug);
    if (!wish) {
      throw new ApiError(404, "NOT_FOUND", "Wish not found");
    }
    return wish;
  }

  async deleteWish(id: string) {
    const wish = (await wishRepository.findWishById(id)) || (await wishRepository.findWishBySlug(id));
    if (!wish) {
      throw new ApiError(404, "NOT_FOUND", "Wish not found");
    }

    // Delete Cloudinary asset if public ID is present
    const contentObj = (wish.content || {}) as Record<string, unknown>;
    const publicId = wish.photoPublicId || (typeof contentObj["photoPublicId"] === "string" ? contentObj["photoPublicId"] : null);

    if (publicId) {
      await storageService.deleteImage(publicId);
    }

    return wishRepository.deleteWish(wish.id);
  }
}

export const wishService = new WishService();
