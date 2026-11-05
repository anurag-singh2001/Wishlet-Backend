export interface CatalogTemplate {
  id: string;
  name: string;
  occasion: string;
  description: string;
}

export interface CatalogOccasion {
  id: string;
  label: string;
  tint: string;
}

// Hardcoded: templates are frontend components, not DB entities.
export const TEMPLATES: CatalogTemplate[] = [
  {
    id: "birthday-minimal",
    name: "Birthday Minimal",
    occasion: "birthday",
    description: "A clean, elegant birthday template with subtle animations.",
  },
  {
    id: "anniversary-elegant",
    name: "Elegant Anniversary",
    occasion: "anniversary",
    description: "An elegant template for celebrating anniversaries.",
  },
  {
    id: "thank-you-simple",
    name: "Simple Thank You",
    occasion: "thank-you",
    description: "A simple and heartfelt thank you template.",
  },
  {
    id: "congratulations-celebration",
    name: "Celebration",
    occasion: "congratulations",
    description: "A celebratory template for achievements and milestones.",
  },
  {
    id: "sorry-sincere",
    name: "Sincere Apology",
    occasion: "sorry",
    description: "A thoughtful and sincere apology template.",
  },
  {
    id: "birthday-neon",
    name: "Neon Party",
    occasion: "birthday",
    description: "Dark glow-in-the-night birthday card with neon type and pop-able balloons.",
  },
  {
    id: "anniversary-cinematic",
    name: "Cinematic",
    occasion: "anniversary",
    description:
      "A film-style anniversary with a slow Ken Burns photo, grain and a letterbox reveal.",
  },
  {
    id: "thank-you-botanical",
    name: "Botanical Thank You",
    occasion: "thank-you",
    description: "Hand-drawn vines and flowers bloom around a handwritten thank-you.",
  },
  {
    id: "congratulations-gold",
    name: "Black & Gold",
    occasion: "congratulations",
    description: "Luxe gold type, light rays and a golden confetti burst.",
  },
  {
    id: "sorry-rain-to-sun",
    name: "Rain to Sunshine",
    occasion: "sorry",
    description: "Soft rain clears into a warm sunrise as your apology appears.",
  },
  {
    id: "diwali-diyas",
    name: "Festival of Lights",
    occasion: "diwali",
    description: "Glowing diyas, a blooming rangoli and soft fireworks in a night sky.",
  },
];

export const OCCASIONS: CatalogOccasion[] = [
  { id: "diwali", label: "Diwali", tint: "#FFF0D6" },
  { id: "birthday", label: "Birthday", tint: "#FFF1EC" },
  { id: "anniversary", label: "Anniversary", tint: "#FDEBF3" },
  { id: "thank-you", label: "Thank you", tint: "#EAF7EF" },
  { id: "congratulations", label: "Congratulations", tint: "#FFF6DC" },
  { id: "sorry", label: "Sorry", tint: "#ECEFFB" },
];
