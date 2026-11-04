import { prisma } from "../utils/prisma.js";

export interface GoogleProfile {
  googleSub: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export class UserRepository {
  async upsertByGoogleSub(profile: GoogleProfile) {
    const { googleSub, ...fields } = profile;
    return prisma.user.upsert({
      where: { googleSub },
      create: { googleSub, ...fields },
      update: fields,
    });
  }

  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }

  /** Blocks (date) or unblocks (null) a user. Returns false when the user doesn't exist. */
  async setBlockedAt(id: string, blockedAt: Date | null): Promise<boolean> {
    const result = await prisma.user.updateMany({ where: { id }, data: { blockedAt } });
    return result.count > 0;
  }
}

export const userRepository = new UserRepository();
