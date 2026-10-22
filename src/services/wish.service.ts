import { wishRepository } from "../repositories/wish.repository.js";
import { storageService } from "./storage.service.js";
import { mediaService } from "./media.service.js";
import { areReactionsEnabled, reactionService } from "./reaction.service.js";
import { rejectIfExpired } from "../utils/expiry.js";
import type { CreateWishInput } from "../schemas/wish.schema.js";
import { ApiError } from "../plugins/error-handler.js";
import { env } from "../config/env.js";
import { Prisma } from "@prisma/client";
import crypto from "node:crypto";
import { hashDeleteToken, isValidDeleteToken } from "../utils/delete-token.js";

/** Proof of ownership: the creator's delete token and/or the signed-in owner's user id. */
export interface OwnerAccess {
  deleteToken?: string;
  userId?: string;
}

export class WishService {
  async createWish(data: CreateWishInput, ownerId?: string) {
    const MAX_RETRIES = 3;

    const { content, photoUrl, photoPublicId } = await mediaService.sanitize(
      (data.content || {}) as Record<string, unknown>,
    );

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
          ...(ownerId ? { owner: { connect: { id: ownerId } } } : {}),
          expiresAt: new Date(Date.now() + env.WISH_TTL_HOURS * 3600_000),
          content: content as Prisma.InputJsonValue,
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
    rejectIfExpired(wish);
    return wish;
  }

  /** Destroys a wish's photo and voice assets unless a wish outside `excludeIds` still uses them. */
  private async destroyMedia(
    wish: { id: string; photoPublicId: string | null; content: unknown },
    excludeIds: string[],
  ): Promise<void> {
    const content = (wish.content || {}) as Record<string, unknown>;
    const photoId =
      wish.photoPublicId ||
      (typeof content["photoPublicId"] === "string" ? content["photoPublicId"] : null);
    const voiceId = typeof content["voicePublicId"] === "string" ? content["voicePublicId"] : null;
    const assets: [string | null, "image" | "video"][] = [
      [photoId, "image"],
      [voiceId, "video"],
    ];
    for (const [publicId, type] of assets) {
      if (!publicId) continue;
      try {
        if ((await wishRepository.countOtherReferences(publicId, excludeIds)) > 0) continue;
        await storageService.deleteMedia(publicId, type);
      } catch (err) {
        console.error("Failed to delete wish media", publicId, err);
      }
    }
  }

  /** Deletes all expired wishes and their media (best-effort). Returns the number removed. */
  async purgeExpired(): Promise<number> {
    const cutoff = new Date();
    const expired = await wishRepository.findExpired(cutoff);
    const expiredIds = expired.map((w) => w.id);
    for (const wish of expired) {
      await this.destroyMedia(wish, expiredIds);
    }
    return wishRepository.deleteExpired(cutoff);
  }

  private assertOwnerAccess<T extends { deleteTokenHash: string | null; ownerId: string | null }>(
    wish: T | null,
    access: OwnerAccess,
  ): asserts wish is T {
    if (!wish) {
      throw new ApiError(404, "NOT_FOUND", "Wish not found");
    }
    const byToken =
      access.deleteToken !== undefined &&
      isValidDeleteToken(access.deleteToken, wish.deleteTokenHash);
    const byOwner = !!access.userId && wish.ownerId === access.userId;
    if (!byToken && !byOwner) {
      throw new ApiError(403, "FORBIDDEN", "Invalid delete token");
    }
  }

  async recordView(slug: string): Promise<number> {
    const wish = await wishRepository.findWishBySlug(slug);
    if (!wish) {
      throw new ApiError(404, "NOT_FOUND", "Wish not found");
    }
    rejectIfExpired(wish);
    const viewCount = await wishRepository.incrementViewCount(slug);
    if (viewCount === null) {
      throw new ApiError(404, "NOT_FOUND", "Wish not found");
    }
    return viewCount;
  }

  async getWishStats(slug: string, access: OwnerAccess) {
    const wish = await wishRepository.findWishBySlug(slug);
    this.assertOwnerAccess(wish, access);
    return {
      viewCount: wish.viewCount,
      createdAt: wish.createdAt,
      expiresAt: wish.expiresAt,
      reactions: await reactionService.getCounts(wish.id),
      reactionsEnabled: areReactionsEnabled(wish.content),
    };
  }

  async updateSettings(
    slug: string,
    access: OwnerAccess,
    reactionsEnabled: boolean,
  ): Promise<{ reactionsEnabled: boolean }> {
    const wish = await wishRepository.findWishBySlug(slug);
    this.assertOwnerAccess(wish, access);
    const content = { ...((wish.content || {}) as Record<string, unknown>), reactionsEnabled };
    await wishRepository.updateContent(wish.id, content as Prisma.InputJsonValue);
    return { reactionsEnabled };
  }

  async deleteWish(id: string, access: OwnerAccess) {
    const wish =
      (await wishRepository.findWishById(id)) || (await wishRepository.findWishBySlug(id));
    this.assertOwnerAccess(wish, access);
    await this.destroyMedia(wish, [wish.id]);
    return wishRepository.deleteWish(wish.id);
  }
}

export const wishService = new WishService();
