export interface CatalogTemplate {
  id: string;
  name: string;
  occasion: string;
  description: string;
}

export type OccasionKind = "core" | "festival";

export interface CatalogOccasion {
  id: string;
  label: string;
  tint: string;
  kind: OccasionKind;
  /** Suggested date range for festivals (ISO), used to pre-fill the admin UI. */
  defaultStartsAt: string | null;
  defaultEndsAt: string | null;
}

const CORE = { kind: "core", defaultStartsAt: null, defaultEndsAt: null } as const;

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
  {
    id: "christmas-snowglobe",
    name: "Snow Globe",
    occasion: "christmas",
    description: "A twinkling snow globe, falling snow and a little pine under the stars.",
  },
  {
    id: "newyear-midnight",
    name: "Midnight Sparkle",
    occasion: "newyear",
    description: "A golden year that pops in under fireworks and rising champagne bubbles.",
  },
];

export const OCCASIONS: CatalogOccasion[] = [
  {
    id: "diwali",
    label: "Diwali",
    tint: "#FFF0D6",
    kind: "festival",
    defaultStartsAt: "2026-11-01T00:00:00.000Z",
    defaultEndsAt: "2026-11-12T23:59:59.000Z",
  },
  {
    id: "christmas",
    label: "Christmas",
    tint: "#FBE7EA",
    kind: "festival",
    defaultStartsAt: "2026-12-12T00:00:00.000Z",
    defaultEndsAt: "2026-12-26T23:59:59.000Z",
  },
  {
    id: "newyear",
    label: "New Year",
    tint: "#ECEBFA",
    kind: "festival",
    defaultStartsAt: "2026-12-27T00:00:00.000Z",
    defaultEndsAt: "2027-01-03T23:59:59.000Z",
  },
  { id: "birthday", label: "Birthday", tint: "#FFF1EC", ...CORE },
  { id: "anniversary", label: "Anniversary", tint: "#FDEBF3", ...CORE },
  { id: "thank-you", label: "Thank you", tint: "#EAF7EF", ...CORE },
  { id: "congratulations", label: "Congratulations", tint: "#FFF6DC", ...CORE },
  { id: "sorry", label: "Sorry", tint: "#ECEFFB", ...CORE },
];
