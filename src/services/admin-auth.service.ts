import type { FastifyRequest } from "fastify";
import { env } from "../config/env.js";
import { ApiError } from "../plugins/error-handler.js";
import { requireUser } from "../plugins/auth.js";
import { userRepository } from "../repositories/user.repository.js";

export class AdminAuthService {
  isAdminEmail(email: string | null | undefined): boolean {
    return !!email && env.ADMIN_EMAILS.includes(email.trim().toLowerCase());
  }

  /** 401 without a session, 403 unless the signed-in user's email is in ADMIN_EMAILS. */
  async requireAdmin(request: FastifyRequest): Promise<{ id: string }> {
    const { id } = requireUser(request);
    const user = await userRepository.findById(id);
    if (!user || !this.isAdminEmail(user.email)) {
      throw new ApiError(403, "FORBIDDEN", "Admin access required.");
    }
    return { id };
  }

  /** 403 BLOCKED when the user has been blocked by an admin. */
  async assertNotBlocked(userId: string): Promise<void> {
    const user = await userRepository.findById(userId);
    if (user?.blockedAt) {
      throw new ApiError(403, "BLOCKED", "Your account has been blocked.");
    }
  }
}

export const adminAuthService = new AdminAuthService();

export function requireAdmin(request: FastifyRequest): Promise<{ id: string }> {
  return adminAuthService.requireAdmin(request);
}
