import { prisma } from "../utils/prisma.js";
import { Prisma } from "@prisma/client";

export class WishRepository {
  async createWish(data: Prisma.WishCreateInput) {
    return prisma.wish.create({
      data,
    });
  }

  async findWishBySlug(slug: string) {
    return prisma.wish.findUnique({
      where: { slug },
    });
  }

  async findWishById(id: string) {
    return prisma.wish.findUnique({
      where: { id },
    });
  }

  async incrementViewCount(slug: string): Promise<number | null> {
    try {
      const updated = await prisma.wish.update({
        where: { slug },
        data: { viewCount: { increment: 1 } },
        select: { viewCount: true },
      });
      return updated.viewCount;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        return null;
      }
      throw error;
    }
  }

  async deleteWish(id: string) {
    return prisma.wish.delete({
      where: { id },
    });
  }

  async findExpired(cutoff: Date) {
    return prisma.wish.findMany({
      where: { expiresAt: { lt: cutoff } },
      select: { id: true, photoPublicId: true },
    });
  }

  async deleteExpired(cutoff: Date): Promise<number> {
    const result = await prisma.wish.deleteMany({ where: { expiresAt: { lt: cutoff } } });
    return result.count;
  }

  async isSlugTaken(slug: string): Promise<boolean> {
    const count = await prisma.wish.count({
      where: { slug },
    });
    return count > 0;
  }
}

export const wishRepository = new WishRepository();
