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
  },
  {
    id: "birthday-neon",
    name: "Neon Party",
    occasion: "birthday",
    description: "Dark glow-in-the-night birthday card with neon type and pop-able balloons."
  },
  {
    id: "anniversary-cinematic",
    name: "Cinematic",
    occasion: "anniversary",
    description: "A film-style anniversary with a slow Ken Burns photo, grain and a letterbox reveal."
  },
  {
    id: "thank-you-botanical",
    name: "Botanical Thank You",
    occasion: "thank-you",
    description: "Hand-drawn vines and flowers bloom around a handwritten thank-you."
  },
  {
    id: "congratulations-gold",
    name: "Black & Gold",
    occasion: "congratulations",
    description: "Luxe gold type, light rays and a golden confetti burst."
  },
  {
    id: "sorry-rain-to-sun",
    name: "Rain to Sunshine",
    occasion: "sorry",
    description: "Soft rain clears into a warm sunrise as your apology appears."
  }
];

export class TemplateController {
  async getTemplates(_request: FastifyRequest, reply: FastifyReply) {
    return reply.send({ templates });
  }
}

export const templateController = new TemplateController();
