import type { FastifyRequest, FastifyReply } from "fastify";
import {
  BrandingSchema,
  CatalogSchema,
  IdParamsSchema,
  StatsQuerySchema,
  WishListQuerySchema,
} from "../schemas/admin.schema.js";
import { requireAdmin } from "../services/admin-auth.service.js";
import { adminService } from "../services/admin.service.js";
import { siteConfigService } from "../services/site-config.service.js";
import { storageService } from "../services/storage.service.js";
import { ApiError } from "../plugins/error-handler.js";

const LOGO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export class AdminController {
  async getConfig(request: FastifyRequest, reply: FastifyReply) {
    await requireAdmin(request);
    const [branding, catalog] = await Promise.all([
      siteConfigService.getBranding(),
      siteConfigService.getCatalog(),
    ]);
    return reply.send({ branding, catalog });
  }

  async putBranding(request: FastifyRequest, reply: FastifyReply) {
    await requireAdmin(request);
    const input = BrandingSchema.parse(request.body);
    return reply.send(await siteConfigService.setBranding(input));
  }

  async putCatalog(request: FastifyRequest, reply: FastifyReply) {
    await requireAdmin(request);
    const input = CatalogSchema.parse(request.body);
    return reply.send(await siteConfigService.setCatalog(input));
  }

  async uploadLogo(request: FastifyRequest, reply: FastifyReply) {
    await requireAdmin(request);
    const data = await request.file();
    if (!data) throw new ApiError(400, "VALIDATION_ERROR", "No file uploaded.");
    if (!LOGO_TYPES.includes(data.mimetype)) {
      throw new ApiError(415, "UNSUPPORTED_TYPE", "Please upload a JPEG, PNG, or WebP image.");
    }
    const result = await storageService.uploadImage(
      await data.toBuffer(),
      data.filename,
      data.mimetype,
    );
    return reply.status(201).send({ url: result.url, publicId: result.publicId });
  }

  async getStats(request: FastifyRequest, reply: FastifyReply) {
    await requireAdmin(request);
    const { days } = StatsQuerySchema.parse(request.query);
    return reply.send(await adminService.getStats(days));
  }

  async listWishes(request: FastifyRequest, reply: FastifyReply) {
    await requireAdmin(request);
    const { q, page } = WishListQuerySchema.parse(request.query);
    return reply.send(await adminService.listWishes(q, page));
  }

  async deleteWish(request: FastifyRequest, reply: FastifyReply) {
    await requireAdmin(request);
    const { id } = IdParamsSchema.parse(request.params);
    await adminService.deleteWish(id);
    return reply.send({ success: true });
  }

  async blockUser(request: FastifyRequest, reply: FastifyReply) {
    return this.setBlocked(request, reply, true);
  }

  async unblockUser(request: FastifyRequest, reply: FastifyReply) {
    return this.setBlocked(request, reply, false);
  }

  private async setBlocked(request: FastifyRequest, reply: FastifyReply, blocked: boolean) {
    await requireAdmin(request);
    const { id } = IdParamsSchema.parse(request.params);
    await adminService.setBlocked(id, blocked);
    return reply.send({ success: true, blocked });
  }
}

export const adminController = new AdminController();
