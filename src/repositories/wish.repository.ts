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

  async deleteWish(id: string) {
    return prisma.wish.delete({
      where: { id },
    });
  }

  async isSlugTaken(slug: string): Promise<boolean> {
    const count = await prisma.wish.count({
      where: { slug },
    });
    return count > 0;
  }
}

export const wishRepository = new WishRepository();
