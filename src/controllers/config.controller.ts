import type { FastifyRequest, FastifyReply } from "fastify";
import { siteConfigService } from "../services/site-config.service.js";

export class ConfigController {
  async getPublicConfig(_request: FastifyRequest, reply: FastifyReply) {
    return reply.send(await siteConfigService.getPublicConfig(new Date()));
  }
}

export const configController = new ConfigController();
