import { wishRepository } from "../repositories/wish.repository.js";
import { storageService } from "./storage.service.js";
import type { CreateWishInput } from "../schemas/wish.schema.js";
import { ApiError } from "../plugins/error-handler.js";
import { env } from "../config/env.js";
import { Prisma } from "@prisma/client";
import crypto from "node:crypto";

function hashDeleteToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function isValidDeleteToken(token: string, storedHash: string | null): boolean {
  if (!storedHash) return false;
  const given = Buffer.from(hashDeleteToken(token), "hex");
  const stored = Buffer.from(storedHash, "hex");
  return given.length === stored.length && crypto.timingSafeEqual(given, stored);
}

export class WishService {
  async createWish(data: CreateWishInput) {
    const MAX_RETRIES = 3;

    // Extract optional photoUrl & photoPublicId from content payload if provided
    const contentObj = (data.content || {}) as Record<string, unknown>;
    const photoUrl =
      typeof contentObj["photoUrl"] === "string"
        ? contentObj["photoUrl"]
        : Array.isArray(contentObj["photos"]) && typeof contentObj["photos"][0] === "string"
          ? contentObj["photos"][0]
          : null;

    const photoPublicId =
      typeof contentObj["photoPublicId"] === "string" ? contentObj["photoPublicId"] : null;

    // Returned once to the creator; only its hash is stored.
    const deleteToken = crypto.randomBytes(24).toString("base64url");
    const deleteTokenHash = hashDeleteToken(deleteToken);

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
          deleteTokenHash,
          expiresAt: new Date(Date.now() + env.WISH_TTL_HOURS * 3600_000),
          content: data.content as Prisma.InputJsonValue,
          slug,
        });

        void this.purgeExpired().catch((err: unknown) => console.error("purgeExpired failed", err));
        return { ...created, deleteToken };
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          if (i === MAX_RETRIES - 1) {
            throw new ApiError(
              500,
              "SLUG_GENERATION_FAILED",
              "Failed to generate a unique URL. Please try again.",
            );
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
    await this.rejectIfExpired(wish);
    return wish;
  }

  /**
   * Expired wishes answer 410 on every read; purgeExpired() deletes them later. Deleting on
   * read would turn the recipient's own request into a 404, because the page's server-side
   * metadata fetch runs first.
   */
  private async rejectIfExpired(wish: { expiresAt: Date | null }): Promise<void> {
    if (!wish.expiresAt || wish.expiresAt.getTime() >= Date.now()) return;
    throw new ApiError(410, "EXPIRED", "This wish has expired.");
  }

  /** Deletes all expired wishes and their photos (best-effort). Returns the number removed. */
  async purgeExpired(): Promise<number> {
    const cutoff = new Date();
    const expired = await wishRepository.findExpired(cutoff);
    for (const { photoPublicId } of expired) {
      if (!photoPublicId) continue;
      try {
        await storageService.deleteImage(photoPublicId);
      } catch (err) {
        console.error("Failed to delete expired wish photo", photoPublicId, err);
      }
    }
    return wishRepository.deleteExpired(cutoff);
  }

  private assertDeleteToken<T extends { deleteTokenHash: string | null }>(
    wish: T | null,
    deleteToken: string,
  ): asserts wish is T {
    if (!wish) {
      throw new ApiError(404, "NOT_FOUND", "Wish not found");
    }
    if (!isValidDeleteToken(deleteToken, wish.deleteTokenHash)) {
      throw new ApiError(403, "FORBIDDEN", "Invalid delete token");
    }
  }

  async recordView(slug: string): Promise<number> {
    const wish = await wishRepository.findWishBySlug(slug);
    if (!wish) {
      throw new ApiError(404, "NOT_FOUND", "Wish not found");
    }
    await this.rejectIfExpired(wish);
    const viewCount = await wishRepository.incrementViewCount(slug);
    if (viewCount === null) {
      throw new ApiError(404, "NOT_FOUND", "Wish not found");
    }
    return viewCount;
  }

  async getWishStats(slug: string, deleteToken: string) {
    const wish = await wishRepository.findWishBySlug(slug);
    this.assertDeleteToken(wish, deleteToken);
    return { viewCount: wish.viewCount, createdAt: wish.createdAt, expiresAt: wish.expiresAt };
  }

  async deleteWish(id: string, deleteToken: string) {
    const wish =
      (await wishRepository.findWishById(id)) || (await wishRepository.findWishBySlug(id));
    this.assertDeleteToken(wish, deleteToken);

    // Delete Cloudinary asset if public ID is present
    const contentObj = (wish.content || {}) as Record<string, unknown>;
    const publicId =
      wish.photoPublicId ||
      (typeof contentObj["photoPublicId"] === "string" ? contentObj["photoPublicId"] : null);

    if (publicId) {
      await storageService.deleteImage(publicId);
    }

    return wishRepository.deleteWish(wish.id);
  }
}

export const wishService = new WishService();
