import type { Prisma } from "@prisma/client";
import { OCCASIONS, TEMPLATES } from "../config/catalog.js";
import { settingRepository } from "../repositories/setting.repository.js";
import {
  BrandingSchema,
  CatalogSchema,
  type Branding,
  type CatalogConfig,
  type OccasionSetting,
} from "../schemas/admin.schema.js";

const BRANDING_KEY = "branding";
const CATALOG_KEY = "catalog";
const CACHE_MS = 60_000;

export const DEFAULT_BRANDING: Branding = {
  appName: "Wishlet",
  logoUrl: null,
  logoPublicId: null,
  faviconUrl: null,
  colors: { primary: "#4f46e5", accent: "#f59e0b", bg: "#ffffff" },
  banner: { enabled: false, text: "", link: null },
  feedbackUrl: null,
};

function defaultCatalog(): CatalogConfig {
  return {
    occasions: OCCASIONS.map((o, order) => ({
      ...o,
      enabled: true,
      order,
      startsAt: null,
      endsAt: null,
      badge: null,
    })),
    templates: TEMPLATES.map((t, order) => ({
      id: t.id,
      enabled: true,
      order,
      featured: false,
      badge: null,
    })),
  };
}

/** Saved catalog plus defaults for any occasion/template added to the code since it was saved. */
function withMissingDefaults(saved: CatalogConfig): CatalogConfig {
  const base = defaultCatalog();
  const occ = new Set(saved.occasions.map((o) => o.id));
  const tpl = new Set(saved.templates.map((t) => t.id));
  const next = saved.occasions.length;
  return {
    occasions: [
      ...saved.occasions,
      ...base.occasions.filter((o) => !occ.has(o.id)).map((o, i) => ({ ...o, order: next + i })),
    ],
    templates: [
      ...saved.templates,
      ...base.templates
        .filter((t) => !tpl.has(t.id))
        .map((t, i) => ({ ...t, order: saved.templates.length + i })),
    ],
  };
}

export function isInSeason(o: OccasionSetting, now: Date): boolean {
  const t = now.getTime();
  if (o.startsAt && t < Date.parse(o.startsAt)) return false;
  if (o.endsAt && t > Date.parse(o.endsAt)) return false;
  return true;
}

export interface PublicTemplate {
  id: string;
  name: string;
  occasion: string;
  description: string;
  featured: boolean;
  badge: string | null;
}

export interface PublicOccasion {
  id: string;
  label: string;
  tint: string;
  badge: string | null;
}

export interface PublicConfig {
  branding: Branding;
  occasions: PublicOccasion[];
  templates: PublicTemplate[];
}

export class SiteConfigService {
  private cache = new Map<string, { at: number; value: unknown }>();

  private async load<T>(
    key: string,
    parse: (raw: unknown) => T | null,
    fallback: () => T,
  ): Promise<T> {
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.value as T;
    const raw = await settingRepository.get(key);
    const value = (raw === null ? null : parse(raw)) ?? fallback();
    this.cache.set(key, { at: Date.now(), value });
    return value;
  }

  private async save<T>(key: string, value: T): Promise<T> {
    await settingRepository.upsert(key, value as unknown as Prisma.InputJsonValue);
    this.cache.delete(key);
    return value;
  }

  clearCache(): void {
    this.cache.clear();
  }

  getBranding(): Promise<Branding> {
    return this.load(
      BRANDING_KEY,
      (raw) => {
        const r = BrandingSchema.safeParse(raw);
        return r.success ? r.data : null;
      },
      () => DEFAULT_BRANDING,
    );
  }

  getCatalog(): Promise<CatalogConfig> {
    return this.load(
      CATALOG_KEY,
      (raw) => {
        const r = CatalogSchema.safeParse(raw);
        return r.success ? withMissingDefaults(r.data) : null;
      },
      defaultCatalog,
    );
  }

  setBranding(input: Branding): Promise<Branding> {
    return this.save(BRANDING_KEY, input);
  }

  setCatalog(input: CatalogConfig): Promise<CatalogConfig> {
    return this.save(CATALOG_KEY, input);
  }

  async getPublicConfig(now: Date): Promise<PublicConfig> {
    const [branding, catalog] = await Promise.all([this.getBranding(), this.getCatalog()]);
    const byOrder = <T extends { order: number }>(a: T, b: T): number => a.order - b.order;
    const occasions = catalog.occasions
      .filter((o) => o.enabled && isInSeason(o, now))
      .sort(byOrder);
    const visible = new Set(occasions.map((o) => o.id));
    const templates = catalog.templates
      .filter((s) => s.enabled)
      .sort(byOrder)
      .flatMap((s) => {
        const base = TEMPLATES.find((t) => t.id === s.id);
        if (!base || !visible.has(base.occasion)) return [];
        return [{ ...base, featured: s.featured, badge: s.badge }];
      });
    return {
      branding,
      occasions: occasions.map(({ id, label, tint, badge }) => ({ id, label, tint, badge })),
      templates,
    };
  }
}

export const siteConfigService = new SiteConfigService();
