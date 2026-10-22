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
}

export const userRepository = new UserRepository();
