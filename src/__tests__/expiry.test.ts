import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { wishService } from "../services/wish.service.js";
import { wishRepository, WishRepository } from "../repositories/wish.repository.js";
import { storageService } from "../services/storage.service.js";
import { ApiError } from "../plugins/error-handler.js";
import type { Prisma } from "@prisma/client";

type WishRecord = NonNullable<Awaited<ReturnType<WishRepository["findWishBySlug"]>>>;

const HOUR = 3600_000;

describe("Wish expiry", () => {
  const original = {
    createWish: wishRepository.createWish,
    findWishBySlug: wishRepository.findWishBySlug,
    deleteWish: wishRepository.deleteWish,
    findExpired: wishRepository.findExpired,
    deleteExpired: wishRepository.deleteExpired,
    countOtherReferences: wishRepository.countOtherReferences,
    deleteMedia: storageService.deleteMedia,
  };
  let stored: WishRecord | null;
  let deleted: string[];
  let images: string[];
  let createdData: Prisma.WishCreateInput | null;
  let purgeCutoffs: Date[];

  const makeWish = (expiresAt: Date | null, photoPublicId: string | null = null): WishRecord => ({
    id: "wish-id",
    slug: "birthday-abcd1234",
    templateId: "birthday-minimal",
    occasion: "birthday",
    photoUrl: null,
    photoPublicId,
    deleteTokenHash: null,
    content: {},
    viewCount: 0,
    expiresAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    stored = null;
    deleted = [];
    images = [];
    createdData = null;
    purgeCutoffs = [];
    wishRepository.createWish = (async (data: Prisma.WishCreateInput) => {
      createdData = data;
      return { ...makeWish(data.expiresAt as Date), slug: data.slug };
    }) as typeof wishRepository.createWish;
    wishRepository.findWishBySlug = (async () => stored) as typeof wishRepository.findWishBySlug;
    wishRepository.deleteWish = (async (id: string) => {
      deleted.push(id);
      return stored;
    }) as typeof wishRepository.deleteWish;
    wishRepository.findExpired = (async (cutoff: Date) => {
      purgeCutoffs.push(cutoff);
      return [
        { id: "a", photoPublicId: "pic-a", content: {} },
        { id: "b", photoPublicId: null, content: {} },
      ];
    }) as typeof wishRepository.findExpired;
    wishRepository.countOtherReferences = (async () => 0) as typeof wishRepository.countOtherReferences;
    wishRepository.deleteExpired = (async (cutoff: Date) => {
      purgeCutoffs.push(cutoff);
      return 2;
    }) as typeof wishRepository.deleteExpired;
    storageService.deleteMedia = (async (id: string) => {
      images.push(id);
      return true;
    }) as typeof storageService.deleteMedia;
  });

  afterEach(() => {
    Object.assign(wishRepository, {
      createWish: original.createWish,
      findWishBySlug: original.findWishBySlug,
      deleteWish: original.deleteWish,
      findExpired: original.findExpired,
      deleteExpired: original.deleteExpired,
      countOtherReferences: original.countOtherReferences,
    });
    storageService.deleteMedia = original.deleteMedia;
  });

  test("create sets expiresAt about 24h ahead", async () => {
    const before = Date.now();
    await wishService.createWish({ templateId: "t", occasion: "birthday", content: {} } as never);
    const at = (createdData as Prisma.WishCreateInput | null)?.expiresAt as Date;
    assert.ok(Math.abs(at.getTime() - (before + 24 * HOUR)) < 5000);
  });

  test("expired wish throws 410 EXPIRED on every read and is left for purgeExpired", async () => {
    stored = makeWish(new Date(Date.now() - 1000), "pic-1");
    for (let i = 0; i < 2; i++) {
      await assert.rejects(
        () => wishService.getWishBySlug("birthday-abcd1234"),
        (e: unknown) => e instanceof ApiError && e.statusCode === 410 && e.errorCode === "EXPIRED",
      );
    }
    assert.deepStrictEqual(deleted, []);
    assert.deepStrictEqual(images, []);
  });

  test("recordView on expired wish throws 410", async () => {
    stored = makeWish(new Date(Date.now() - 1000));
    await assert.rejects(
      () => wishService.recordView("birthday-abcd1234"),
      (e: unknown) => e instanceof ApiError && e.statusCode === 410,
    );
  });

  test("future and null expiresAt still return the wish", async () => {
    stored = makeWish(new Date(Date.now() + HOUR));
    assert.strictEqual((await wishService.getWishBySlug("x")).id, "wish-id");
    stored = makeWish(null);
    assert.strictEqual((await wishService.getWishBySlug("x")).id, "wish-id");
    assert.deepStrictEqual(deleted, []);
  });

  test("purgeExpired deletes photos and rows older than the cutoff", async () => {
    const before = Date.now();
    const count = await wishService.purgeExpired();
    assert.strictEqual(count, 2);
    assert.deepStrictEqual(images, ["pic-a"]);
    assert.strictEqual(purgeCutoffs.length, 2);
    assert.ok(purgeCutoffs[1]?.getTime() ?? 0 >= before);
    assert.strictEqual(purgeCutoffs[0], purgeCutoffs[1]);
  });
});
