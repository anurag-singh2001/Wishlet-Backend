import { prisma } from "../utils/prisma.js";

export class ReactionRepository {
  async upsert(wishId: string, voterHash: string, reaction: string): Promise<void> {
    await prisma.reaction.upsert({
      where: { wishId_voterHash: { wishId, voterHash } },
      create: { wishId, voterHash, reaction },
      update: { reaction },
    });
  }

  async remove(wishId: string, voterHash: string): Promise<void> {
    await prisma.reaction.deleteMany({ where: { wishId, voterHash } });
  }

  async countByReaction(wishId: string): Promise<Record<string, number>> {
    const rows = await prisma.reaction.groupBy({
      by: ["reaction"],
      where: { wishId },
      _count: { _all: true },
    });
    return Object.fromEntries(rows.map((r) => [r.reaction, r._count._all]));
  }
}

export const reactionRepository = new ReactionRepository();
