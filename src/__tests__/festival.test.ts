process.env["DATABASE_URL"] ??= "postgresql://test:test@localhost:5432/test";
process.env["JWT_SECRET"] = "test-secret-test-secret-test-secret";

import { test, describe } from "node:test";
import assert from "node:assert";
import { festivalStatus, pickActiveFestival, type FestivalLike } from "../services/festival.js";
import { CatalogSchema, CatalogUpdateSchema } from "../schemas/admin.schema.js";

const S = "2026-11-01T00:00:00.000Z";
const E = "2026-11-12T00:00:00.000Z";
const fest = (p: Partial<FestivalLike> & { id: string }): FestivalLike => ({
  enabled: true,
  festiveLook: true,
  startsAt: S,
  endsAt: E,
  ...p,
});

describe("festivalStatus", () => {
  const f = { enabled: true, startsAt: S, endsAt: E };
  test("off when unpublished", () => {
    assert.strictEqual(festivalStatus({ ...f, enabled: false }, new Date("2026-11-05")), "off");
  });
  test("scheduled, live, ended", () => {
    assert.strictEqual(festivalStatus(f, new Date("2026-10-31")), "scheduled");
    assert.strictEqual(festivalStatus(f, new Date("2026-11-05")), "live");
    assert.strictEqual(festivalStatus(f, new Date("2026-11-13")), "ended");
  });
  test("open-ended bounds are unbounded", () => {
    const now = new Date("2030-01-01");
    assert.strictEqual(festivalStatus({ ...f, endsAt: null }, now), "live");
    assert.strictEqual(festivalStatus({ ...f, startsAt: null }, new Date("2020-01-01")), "live");
    assert.strictEqual(festivalStatus({ ...f, startsAt: null, endsAt: null }, now), "live");
  });
});

describe("pickActiveFestival", () => {
  const now = new Date("2026-11-05");
  test("latest start wins", () => {
    const list = [
      fest({ id: "a", startsAt: "2026-10-20T00:00:00.000Z" }),
      fest({ id: "b", startsAt: "2026-11-03T00:00:00.000Z" }),
    ];
    assert.strictEqual(pickActiveFestival(list, now), "b");
  });
  test("ignores festiveLook=false, off, and non-live", () => {
    const list = [
      fest({ id: "a", festiveLook: false }),
      fest({ id: "b", enabled: false }),
      fest({ id: "c", startsAt: "2026-12-01T00:00:00.000Z", endsAt: null }),
    ];
    assert.strictEqual(pickActiveFestival(list, now), null);
  });
});

describe("catalog validation", () => {
  const occ = (id: string, extra: object): object => ({
    id,
    label: id,
    tint: "#FFFFFF",
    enabled: true,
    order: 0,
    startsAt: null,
    endsAt: null,
    badge: null,
    ...extra,
  });
  test("core occasions reject dates", () => {
    const r = CatalogUpdateSchema.safeParse({ occasions: [occ("birthday", { startsAt: S })] });
    assert.strictEqual(r.success, false);
    assert.match(JSON.stringify(r.error?.issues), /cannot have start\/end dates/);
  });
  test("festivals accept dates and kind is derived", () => {
    const r = CatalogUpdateSchema.parse({ occasions: [occ("diwali", { startsAt: S, endsAt: E })] });
    assert.strictEqual(r.occasions[0]?.kind, "festival");
    assert.strictEqual(r.occasions[0]?.festiveLook, false);
  });
  test("old stored data without kind/festiveLook/templates loads", () => {
    const r = CatalogSchema.parse({ occasions: [occ("sorry", {})] });
    assert.strictEqual(r.occasions[0]?.kind, "core");
    assert.deepStrictEqual(r.templates, []);
  });
});
