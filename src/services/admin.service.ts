import { adminRepository } from "../repositories/admin.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { ApiError } from "../plugins/error-handler.js";
import { wishService } from "./wish.service.js";

const DAY_MS = 86_400_000;

export interface AdminStats {
  totals: { wishes: number; views: number; reactions: number; users: number };
  perDay: { date: string; wishes: number }[];
  perOccasion: { occasion: string; wishes: number }[];
  perTemplate: { templateId: string; wishes: number }[];
}

export class AdminService {
  async getStats(days: number, now = new Date()): Promise<AdminStats> {
    const since = new Date(now.getTime() - days * DAY_MS);
    const [totals, dates, perOccasion, perTemplate] = await Promise.all([
      adminRepository.totals(),
      adminRepository.wishDates(since),
      adminRepository.countByOccasion(since),
      adminRepository.countByTemplate(since),
    ]);
    const counts = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) {
      counts.set(new Date(now.getTime() - i * DAY_MS).toISOString().slice(0, 10), 0);
    }
    for (const d of dates) {
      const key = d.toISOString().slice(0, 10);
      if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const perDay = [...counts].map(([date, wishes]) => ({ date, wishes }));
    return { totals, perDay, perOccasion, perTemplate };
  }

  async listWishes(q: string, page: number) {
    const { items, total } = await adminRepository.searchWishes(q, page);
    return { items, total, page };
  }

  async deleteWish(id: string): Promise<void> {
    await wishService.adminDelete(id);
  }

  async setBlocked(userId: string, blocked: boolean): Promise<void> {
    const found = await userRepository.setBlockedAt(userId, blocked ? new Date() : null);
    if (!found) throw new ApiError(404, "NOT_FOUND", "User not found");
  }
}

export const adminService = new AdminService();
