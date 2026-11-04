process.env["DATABASE_URL"] ??= "postgresql://test:test@localhost:5432/test";
process.env["JWT_SECRET"] = "test-secret-test-secret-test-secret";

import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import type { FastifyInstance } from "fastify";
import { env } from "../config/env.js";
import { wishRepository } from "../repositories/wish.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { settingRepository } from "../repositories/setting.repository.js";
import { signSessionToken } from "../utils/session-token.js";
import { siteConfigService } from "../services/site-config.service.js";
import type { CatalogConfig } from "../schemas/admin.schema.js";

const USERS: Record<string, { email: string; blockedAt: Date | null }> = {
  admin: { email: "boss@example.com", blockedAt: null },
  user: { email: "a@example.com", blockedAt: null },
  blocked: { email: "b@example.com", blockedAt: new Date() },
};

describe("admin portal", () => {
  let app: FastifyInstance;
  let store: Record<string, unknown>;
  let created = 0;
  const saved = {
    get: settingRepository.get,
    upsert: settingRepository.upsert,
    findUser: userRepository.findById,
    createWish: wishRepository.createWish,
    findExpired: wishRepository.findExpired,
    deleteExpired: wishRepository.deleteExpired,
  };

  before(async () => {
    // env is loaded before this file body runs (static imports), so set the list directly.
    env.ADMIN_EMAILS = ["boss@example.com"];
    const { buildApp } = await import("../app.js");
    app = await buildApp();
    settingRepository.get = (async (key: string) => store[key] ?? null) as typeof saved.get;
    settingRepository.upsert = (async (key: string, value: unknown) => {
      store[key] = value;
    }) as typeof saved.upsert;
    userRepository.findById = (async (id: string) => {
      const u = USERS[id];
      return u ? { id, ...u } : null;
    }) as unknown as typeof saved.findUser;
    wishRepository.createWish = (async (data: Record<string, unknown>) => {
      created++;
      return { ...data, id: "w1", createdAt: new Date(), content: {} };
    }) as unknown as typeof saved.createWish;
    wishRepository.findExpired = (async () => []) as typeof saved.findExpired;
    wishRepository.deleteExpired = (async () => 0) as typeof saved.deleteExpired;
  });

  after(async () => {
    await app.close();
    settingRepository.get = saved.get;
    settingRepository.upsert = saved.upsert;
    userRepository.findById = saved.findUser;
    wishRepository.createWish = saved.createWish;
    wishRepository.findExpired = saved.findExpired;
    wishRepository.deleteExpired = saved.deleteExpired;
  });

  const reset = (): void => {
    store = {};
    created = 0;
    siteConfigService.clearCache();
  };
  const as = async (id: string): Promise<Record<string, string>> => ({
    authorization: `Bearer ${await signSessionToken(id)}`,
  });
  const create = async (id: string, templateId = "birthday-minimal", occasion = "birthday") =>
    app.inject({
      method: "POST",
      url: "/api/v1/wishes",
      headers: await as(id),
      payload: { templateId, occasion, content: {} },
    });

  test("non-admin gets 403, anonymous 401, admin 200", async () => {
    reset();
    const url = "/api/v1/admin/config";
    assert.strictEqual((await app.inject({ method: "GET", url })).statusCode, 401);
    const res = await app.inject({ method: "GET", url, headers: await as("user") });
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual((res.json() as { error: string }).error, "FORBIDDEN");
    const ok = await app.inject({ method: "GET", url, headers: await as("admin") });
    assert.strictEqual(ok.statusCode, 200);
  });

  test("/me reports isAdmin", async () => {
    reset();
    const me = async (id: string): Promise<boolean> =>
      (await app.inject({ method: "GET", url: "/api/v1/me", headers: await as(id) })).json<{
        isAdmin: boolean;
      }>().isAdmin;
    assert.strictEqual(await me("admin"), true);
    assert.strictEqual(await me("user"), false);
  });

  test("branding round-trips and is validated", async () => {
    reset();
    const headers = await as("admin");
    const branding = {
      appName: "Acme",
      logoUrl: null,
      logoPublicId: null,
      faviconUrl: null,
      colors: { primary: "#112233", accent: "#445566", bg: "#ffffff" },
      banner: { enabled: true, text: "Hi", link: null },
      feedbackUrl: null,
    };
    const put = await app.inject({
      method: "PUT",
      url: "/api/v1/admin/config/branding",
      headers,
      payload: branding,
    });
    assert.strictEqual(put.statusCode, 200);
    const got = await app.inject({ method: "GET", url: "/api/v1/admin/config", headers });
    assert.deepStrictEqual(got.json<{ branding: unknown }>().branding, branding);
    const bad = await app.inject({
      method: "PUT",
      url: "/api/v1/admin/config/branding",
      headers,
      payload: { ...branding, colors: { ...branding.colors, primary: "red" } },
    });
    assert.strictEqual(bad.statusCode, 400);
  });

  test("catalog with an unknown template id is rejected", async () => {
    reset();
    const catalog = await siteConfigService.getCatalog();
    const res = await app.inject({
      method: "PUT",
      url: "/api/v1/admin/config/catalog",
      headers: await as("admin"),
      payload: {
        ...catalog,
        templates: [{ id: "nope", enabled: true, order: 0, featured: false, badge: null }],
      },
    });
    assert.strictEqual(res.statusCode, 400);
  });

  async function disableTemplate(id: string): Promise<void> {
    const catalog = await siteConfigService.getCatalog();
    const next: CatalogConfig = {
      ...catalog,
      templates: catalog.templates.map((t) => (t.id === id ? { ...t, enabled: false } : t)),
    };
    await siteConfigService.setCatalog(next);
  }

  test("disabled template is rejected on create and hidden from /templates", async () => {
    reset();
    assert.strictEqual((await create("user")).statusCode, 201);
    await disableTemplate("birthday-minimal");
    const res = await create("user");
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual((res.json() as { error: string }).error, "UNAVAILABLE");
    const list = await app.inject({ method: "GET", url: "/api/v1/templates" });
    const ids = list.json<{ templates: { id: string }[] }>().templates.map((t) => t.id);
    assert.ok(!ids.includes("birthday-minimal"));
    assert.ok(ids.includes("birthday-neon"));
  });

  test("blocked user gets 403 BLOCKED on create", async () => {
    reset();
    const res = await create("blocked");
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual((res.json() as { error: string }).error, "BLOCKED");
    assert.strictEqual(created, 0);
  });

  test("getPublicConfig hides out-of-season occasions and their templates", async () => {
    reset();
    const catalog = await siteConfigService.getCatalog();
    await siteConfigService.setCatalog({
      ...catalog,
      occasions: catalog.occasions.map((o) =>
        o.id === "diwali"
          ? { ...o, startsAt: "2026-10-01T00:00:00.000Z", endsAt: "2026-11-15T00:00:00.000Z" }
          : o,
      ),
    });
    const inSeason = await siteConfigService.getPublicConfig(new Date("2026-11-01T00:00:00Z"));
    assert.ok(inSeason.occasions.some((o) => o.id === "diwali"));
    assert.ok(inSeason.templates.some((t) => t.id === "diwali-diyas"));
    const after = await siteConfigService.getPublicConfig(new Date("2026-12-01T00:00:00Z"));
    assert.ok(!after.occasions.some((o) => o.id === "diwali"));
    assert.ok(!after.templates.some((t) => t.id === "diwali-diyas"));
  });
});
