import { prisma } from "../utils/prisma.js";
import type { Prisma } from "@prisma/client";

export const ADMIN_PAGE_SIZE = 20;

export class AdminRepository {
  async totals(): Promise<{ wishes: number; views: number; reactions: number; users: number }> {
    const [wishes, views, reactions, users] = await Promise.all([
      prisma.wish.count(),
      prisma.wish.aggregate({ _sum: { viewCount: true } }),
      prisma.reaction.count(),
      prisma.user.count(),
    ]);
    return { wishes, views: views._sum.viewCount ?? 0, reactions, users };
  }

  async wishDates(since: Date): Promise<Date[]> {
    const rows = await prisma.wish.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    });
    return rows.map((r) => r.createdAt);
  }

  async countByOccasion(since: Date): Promise<{ occasion: string; wishes: number }[]> {
    const rows = await prisma.wish.groupBy({
      by: ["occasion"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    });
    return rows.map((r) => ({ occasion: r.occasion, wishes: r._count._all }));
  }

  async countByTemplate(since: Date): Promise<{ templateId: string; wishes: number }[]> {
    const rows = await prisma.wish.groupBy({
      by: ["templateId"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    });
    return rows.map((r) => ({ templateId: r.templateId, wishes: r._count._all }));
  }

  async searchWishes(q: string, page: number) {
    const where: Prisma.WishWhereInput = q
      ? {
          OR: [
            { slug: { contains: q, mode: "insensitive" } },
            { owner: { is: { email: { contains: q, mode: "insensitive" } } } },
          ],
        }
      : {};
    const [items, total] = await Promise.all([
      prisma.wish.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * ADMIN_PAGE_SIZE,
        take: ADMIN_PAGE_SIZE,
        select: {
          id: true,
          slug: true,
          occasion: true,
          templateId: true,
          viewCount: true,
          createdAt: true,
          owner: { select: { id: true, email: true, name: true, blockedAt: true } },
        },
      }),
      prisma.wish.count({ where }),
    ]);
    return { items, total };
  }
}

export const adminRepository = new AdminRepository();
