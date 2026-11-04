import { z } from "zod";
import { OCCASIONS, TEMPLATES } from "../config/catalog.js";

const HEX = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Expected #RRGGBB");
const URL_OR_NULL = z.string().url().nullable();
const BADGE = z.string().max(16).nullable();

export const BrandingSchema = z.object({
  appName: z.string().min(1).max(40),
  logoUrl: URL_OR_NULL,
  logoPublicId: z.string().nullable(),
  faviconUrl: URL_OR_NULL,
  colors: z.object({ primary: HEX, accent: HEX, bg: HEX }),
  banner: z.object({
    enabled: z.boolean(),
    text: z.string().max(140),
    link: URL_OR_NULL,
  }),
  feedbackUrl: URL_OR_NULL,
});
export type Branding = z.infer<typeof BrandingSchema>;

const OCCASION_IDS = new Set(OCCASIONS.map((o) => o.id));
const TEMPLATE_IDS = new Set(TEMPLATES.map((t) => t.id));

const OccasionSettingSchema = z.object({
  id: z.string().refine((id) => OCCASION_IDS.has(id), "Unknown occasion id"),
  label: z.string().min(1).max(40),
  tint: HEX,
  enabled: z.boolean(),
  order: z.number().int(),
  startsAt: z.string().datetime().nullable(),
  endsAt: z.string().datetime().nullable(),
  badge: BADGE,
});

const TemplateSettingSchema = z.object({
  id: z.string().refine((id) => TEMPLATE_IDS.has(id), "Unknown template id"),
  enabled: z.boolean(),
  order: z.number().int(),
  featured: z.boolean(),
  badge: BADGE,
});

export const CatalogSchema = z.object({
  occasions: z.array(OccasionSettingSchema),
  templates: z.array(TemplateSettingSchema),
});
export type CatalogConfig = z.infer<typeof CatalogSchema>;
export type OccasionSetting = z.infer<typeof OccasionSettingSchema>;
export type TemplateSetting = z.infer<typeof TemplateSettingSchema>;

export const StatsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

export const WishListQuerySchema = z.object({
  q: z.string().trim().max(100).default(""),
  page: z.coerce.number().int().min(1).default(1),
});

export const IdParamsSchema = z.object({ id: z.string().min(1) });
