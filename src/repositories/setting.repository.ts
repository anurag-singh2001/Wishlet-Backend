import { prisma } from "../utils/prisma.js";
import type { Prisma } from "@prisma/client";

export class SettingRepository {
  async get(key: string): Promise<unknown> {
    const row = await prisma.siteSetting.findUnique({ where: { key } });
    return row ? row.value : null;
  }

  async upsert(key: string, value: Prisma.InputJsonValue): Promise<void> {
    await prisma.siteSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }
}

export const settingRepository = new SettingRepository();
