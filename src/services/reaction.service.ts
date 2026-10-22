import crypto from "node:crypto";
import { env } from "../config/env.js";
import { ApiError } from "../plugins/error-handler.js";
import { reactionRepository } from "../repositories/reaction.repository.js";
import { wishRepository } from "../repositories/wish.repository.js";
import { REACTION_IDS, type ReactionId } from "../schemas/wish.schema.js";
import { rejectIfExpired } from "../utils/expiry.js";

export function areReactionsEnabled(content: unknown): boolean {
  return (content as Record<string, unknown> | null)?.["reactionsEnabled"] !== false;
}

export function hashVoter(voterId: string): string {
  return crypto.createHash("sha256").update(`${env.REACTION_SALT}:${voterId}`).digest("hex");
}

export class ReactionService {
  async react(
    slug: string,
    reaction: ReactionId | null,
    voterId: string,
  ): Promise<{ reaction: ReactionId | null }> {
    const wish = await wishRepository.findWishBySlug(slug);
    if (!wish) throw new ApiError(404, "NOT_FOUND", "Wish not found");
    rejectIfExpired(wish);
    if (!areReactionsEnabled(wish.content)) {
      throw new ApiError(403, "REACTIONS_DISABLED", "Reactions are turned off for this wish.");
    }
    const voterHash = hashVoter(voterId);
    if (reaction === null) await reactionRepository.remove(wish.id, voterHash);
    else await reactionRepository.upsert(wish.id, voterHash, reaction);
    return { reaction };
  }

  async getCounts(wishId: string): Promise<Record<ReactionId, number>> {
    const counts = await reactionRepository.countByReaction(wishId);
    return Object.fromEntries(REACTION_IDS.map((id) => [id, counts[id] ?? 0])) as Record<
      ReactionId,
      number
    >;
  }
}

export const reactionService = new ReactionService();
