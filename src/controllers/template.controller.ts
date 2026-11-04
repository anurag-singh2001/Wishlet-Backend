import type { FastifyRequest, FastifyReply } from "fastify";
import { siteConfigService } from "../services/site-config.service.js";

export class TemplateController {
  async getTemplates(_request: FastifyRequest, reply: FastifyReply) {
    const { templates } = await siteConfigService.getPublicConfig(new Date());
    return reply.send({ templates });
  }
}

export const templateController = new TemplateController();
