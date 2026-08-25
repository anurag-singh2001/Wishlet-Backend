import type { FastifyRequest, FastifyReply } from "fastify";

// Hardcoded for MVP since templates are components, not DB entities
const templates = [
  {
    id: "birthday-minimal",
    name: "Birthday Minimal",
    occasion: "birthday",
    description: "A clean, elegant birthday template with subtle animations."
  },
  {
    id: "anniversary-elegant",
    name: "Elegant Anniversary",
    occasion: "anniversary",
    description: "An elegant template for celebrating anniversaries."
  },
  {
    id: "thank-you-simple",
    name: "Simple Thank You",
    occasion: "thank-you",
    description: "A simple and heartfelt thank you template."
  },
  {
    id: "congratulations-celebration",
    name: "Celebration",
    occasion: "congratulations",
    description: "A celebratory template for achievements and milestones."
  },
  {
    id: "sorry-sincere",
    name: "Sincere Apology",
    occasion: "sorry",
    description: "A thoughtful and sincere apology template."
  }
];

export class TemplateController {
  async getTemplates(_request: FastifyRequest, reply: FastifyReply) {
    return reply.send({ templates });
  }
}

export const templateController = new TemplateController();
