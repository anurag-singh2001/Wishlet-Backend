import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { wishService } from "../services/wish.service.js";
import { wishRepository, WishRepository } from "../repositories/wish.repository.js";
import { storageService } from "../services/storage.service.js";
import { Prisma } from "@prisma/client";
import { ApiError } from "../plugins/error-handler.js";

type WishRecord = NonNullable<Awaited<ReturnType<WishRepository["findWishBySlug"]>>>;

describe("Wish deletion requires the creator's delete token", () => {
  const original = {
    createWish: wishRepository.createWish,
    findWishById: wishRepository.findWishById,
    findWishBySlug: wishRepository.findWishBySlug,
    deleteWish: wishRepository.deleteWish,
    deleteMedia: storageService.deleteMedia,
  };
  let stored: WishRecord | null;
  let deleted: string[];

  beforeEach(() => {
    stored = null;
    deleted = [];
    wishRepository.createWish = (async (data: Prisma.WishCreateInput) => {
      stored = {
        id: "wish-id",
        slug: data.slug,
        templateId: data.templateId,
        occasion: data.occasion,
        photoUrl: null,
        photoPublicId: null,
        deleteTokenHash: data.deleteTokenHash ?? null,
        content: {},
        viewCount: 0,
        createdAt: new Date(),
        expiresAt: null,
        updatedAt: new Date(),
      };
      return stored;
    }) as typeof wishRepository.createWish;
    wishRepository.findWishById = (async () => null) as typeof wishRepository.findWishById;
    wishRepository.findWishBySlug = (async () => stored) as typeof wishRepository.findWishBySlug;
    wishRepository.deleteWish = (async (id: string) => {
      deleted.push(id);
      return stored;
    }) as typeof wishRepository.deleteWish;
    storageService.deleteMedia = (async () => true) as typeof storageService.deleteMedia;
  });

  afterEach(() => {
    Object.assign(wishRepository, {
      createWish: original.createWish,
      findWishById: original.findWishById,
      findWishBySlug: original.findWishBySlug,
      deleteWish: original.deleteWish,
    });
    storageService.deleteMedia = original.deleteMedia;
  });

  const create = () =>
    wishService.createWish({ templateId: "birthday-minimal", occasion: "birthday", content: {} });

  const assertForbidden = (err: unknown): boolean => {
    assert.ok(err instanceof ApiError);
    assert.strictEqual(err.statusCode, 403);
    assert.strictEqual(err.errorCode, "FORBIDDEN");
    return true;
  };

  test("returns a token on create and stores only its hash", async () => {
    const wish = await create();
    assert.ok(wish.deleteToken.length >= 32);
    assert.ok(stored?.deleteTokenHash);
    assert.notStrictEqual(stored.deleteTokenHash, wish.deleteToken);
  });

  test("deletes with the correct token", async () => {
    const wish = await create();
    await wishService.deleteWish(wish.slug, wish.deleteToken);
    assert.deepStrictEqual(deleted, ["wish-id"]);
  });

  test("rejects a wrong token", async () => {
    const wish = await create();
    await assert.rejects(wishService.deleteWish(wish.slug, "wrong-token"), assertForbidden);
    assert.deepStrictEqual(deleted, []);
  });

  test("rejects deletion of legacy wishes that have no token", async () => {
    const wish = await create();
    if (stored) stored.deleteTokenHash = null;
    await assert.rejects(wishService.deleteWish(wish.slug, wish.deleteToken), assertForbidden);
    assert.deepStrictEqual(deleted, []);
  });
});
