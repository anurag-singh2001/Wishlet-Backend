import type { FastifyRequest, FastifyReply } from "fastify";
import { requireUser } from "../plugins/auth.js";
import { ClaimBodySchema, GoogleAuthBodySchema } from "../schemas/auth.schema.js";
import { authService } from "../services/auth.service.js";
import { meService } from "../services/me.service.js";

export class AuthController {
  async google(request: FastifyRequest, reply: FastifyReply) {
    const { credential } = GoogleAuthBodySchema.parse(request.body);
    return reply.send(await authService.signInWithGoogle(credential));
  }

  async me(request: FastifyRequest, reply: FastifyReply) {
    const { id } = requireUser(request);
    return reply.send({ user: await authService.getUser(id) });
  }

  async myWishes(request: FastifyRequest, reply: FastifyReply) {
    const { id } = requireUser(request);
    return reply.send({ wishes: await meService.listWishes(id) });
  }

  async claim(request: FastifyRequest, reply: FastifyReply) {
    const { id } = requireUser(request);
    const { wishes } = ClaimBodySchema.parse(request.body);
    return reply.send({ claimed: await meService.claimWishes(id, wishes) });
  }
}

export const authController = new AuthController();
