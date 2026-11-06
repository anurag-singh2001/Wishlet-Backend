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

const OCCASION_KINDS = new Map(OCCASIONS.map((o) => [o.id, o.kind]));
const TEMPLATE_IDS = new Set(TEMPLATES.map((t) => t.id));

const OccasionSettingSchema = z
  .object({
    id: z.string().refine((id) => OCCASION_KINDS.has(id), "Unknown occasion id"),
    label: z.string().min(1).max(40),
    tint: HEX,
    /** Server-owned: always derived from the occasion id; a client value is ignored. */
    kind: z.enum(["core", "festival"]).optional(),
    /** Core: visible. Festival: published. */
    enabled: z.boolean(),
    order: z.number().int(),
    festiveLook: z.boolean().default(false),
    startsAt: z.string().datetime().nullable(),
    endsAt: z.string().datetime().nullable(),
    badge: BADGE,
  })
  .superRefine((o, ctx) => {
    if (OCCASION_KINDS.get(o.id) === "core" && (o.startsAt !== null || o.endsAt !== null)) {
      ctx.addIssue({
        code: "custom",
        path: [o.startsAt !== null ? "startsAt" : "endsAt"],
        message: "Core occasions are always on and cannot have start/end dates.",
      });
    }
  })
  .transform((o) => ({ ...o, kind: OCCASION_KINDS.get(o.id) ?? "core" }));

/** Templates are no longer editable from the admin UI; kept in stored data only. */
const TemplateSettingSchema = z.object({
  id: z.string().refine((id) => TEMPLATE_IDS.has(id), "Unknown template id"),
  enabled: z.boolean(),
  order: z.number().int(),
  featured: z.boolean(),
  badge: BADGE,
});

/** PUT body. Any `templates` key is ignored (stripped). */
export const CatalogUpdateSchema = z.object({ occasions: z.array(OccasionSettingSchema) });

/** Stored shape. Old data without kind/festiveLook/templates still loads. */
export const CatalogSchema = z.object({
  occasions: z.array(OccasionSettingSchema),
  templates: z.array(TemplateSettingSchema).default([]),
});
export type CatalogConfig = z.infer<typeof CatalogSchema>;
export type CatalogUpdate = z.infer<typeof CatalogUpdateSchema>;
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
