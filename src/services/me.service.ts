import { wishRepository } from "../repositories/wish.repository.js";
import { areReactionsEnabled, reactionService } from "./reaction.service.js";
import { isValidDeleteToken } from "../utils/delete-token.js";
import type { ReactionId } from "../schemas/wish.schema.js";

export interface OwnedWishSummary {
  slug: string;
  occasion: string;
  templateId: string;
  recipientName: string | null;
  createdAt: Date;
  expiresAt: Date | null;
  viewCount: number;
  reactions: Record<ReactionId, number>;
  reactionsEnabled: boolean;
}

export class MeService {
  async listWishes(userId: string): Promise<OwnedWishSummary[]> {
    const wishes = await wishRepository.findOwnedActive(userId, new Date());
    return Promise.all(
      wishes.map(async (w) => {
        const name = (w.content as Record<string, unknown> | null)?.["recipientName"];
        return {
          slug: w.slug,
          occasion: w.occasion,
          templateId: w.templateId,
          recipientName: typeof name === "string" && name ? name : null,
          createdAt: w.createdAt,
          expiresAt: w.expiresAt,
          viewCount: w.viewCount,
          reactions: await reactionService.getCounts(w.id),
          reactionsEnabled: areReactionsEnabled(w.content),
        };
      }),
    );
  }

  /** Attaches unowned wishes to the user when their delete token checks out. */
  async claimWishes(userId: string, items: { slug: string; token: string }[]): Promise<number> {
    let claimed = 0;
    for (const { slug, token } of items) {
      const wish = await wishRepository.findWishBySlug(slug);
      if (!wish || wish.ownerId || !isValidDeleteToken(token, wish.deleteTokenHash)) continue;
      if (await wishRepository.claimOwner(wish.id, userId)) claimed++;
    }
    return claimed;
  }
}

export const meService = new MeService();
