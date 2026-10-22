import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import crypto from "node:crypto";
import { wishService } from "../services/wish.service.js";
import { wishController } from "../controllers/wish.controller.js";
import { wishRepository, WishRepository } from "../repositories/wish.repository.js";
import { reactionRepository } from "../repositories/reaction.repository.js";
import { ApiError } from "../plugins/error-handler.js";
import type { FastifyReply, FastifyRequest } from "fastify";

type WishRecord = NonNullable<Awaited<ReturnType<WishRepository["findWishBySlug"]>>>;

const TOKEN = "good-token";

describe("Wish view count", () => {
  const original = {
    findWishBySlug: wishRepository.findWishBySlug,
    incrementViewCount: wishRepository.incrementViewCount,
  };
  const originalCount = reactionRepository.countByReaction;
  let stored: WishRecord | null;

  beforeEach(() => {
    reactionRepository.countByReaction =
      (async () => ({})) as typeof reactionRepository.countByReaction;
    stored = {
      id: "wish-id",
      slug: "birthday-abcd1234",
      templateId: "birthday-minimal",
      occasion: "birthday",
      photoUrl: null,
      photoPublicId: null,
      deleteTokenHash: crypto.createHash("sha256").update(TOKEN).digest("hex"),
      ownerId: null,
      content: {},
      viewCount: 5,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      expiresAt: null,
      updatedAt: new Date(),
    };
    wishRepository.findWishBySlug = (async (slug: string) =>
      stored && stored.slug === slug ? stored : null) as typeof wishRepository.findWishBySlug;
    wishRepository.incrementViewCount = (async (slug: string) => {
      if (!stored || stored.slug !== slug) return null;
      stored.viewCount += 1;
      return stored.viewCount;
    }) as typeof wishRepository.incrementViewCount;
  });

  afterEach(() => {
    Object.assign(wishRepository, original);
    reactionRepository.countByReaction = originalCount;
  });

  const assertStatus =
    (status: number) =>
    (err: unknown): boolean => {
      assert.ok(err instanceof ApiError);
      assert.strictEqual(err.statusCode, status);
      return true;
    };

  test("increments the view count", async () => {
    assert.strictEqual(await wishService.recordView("birthday-abcd1234"), 6);
    assert.strictEqual(await wishService.recordView("birthday-abcd1234"), 7);
  });

  test("404s for an unknown wish", async () => {
    await assert.rejects(wishService.recordView("nope"), assertStatus(404));
  });

  test("stats rejects a wrong token", async () => {
    await assert.rejects(
      wishService.getWishStats("birthday-abcd1234", { deleteToken: "bad" }),
      assertStatus(403),
    );
  });

  test("stats 404s for an unknown wish", async () => {
    await assert.rejects(
      wishService.getWishStats("nope", { deleteToken: TOKEN }),
      assertStatus(404),
    );
  });

  test("stats returns the count with a good token", async () => {
    const stats = await wishService.getWishStats("birthday-abcd1234", { deleteToken: TOKEN });
    assert.strictEqual(stats.viewCount, 5);
    assert.deepStrictEqual(stats.createdAt, stored?.createdAt);
  });

  test("public GET neither increments nor leaks viewCount or the token hash", async () => {
    let body: Record<string, unknown> = {};
    const reply = {
      send: (payload: Record<string, unknown>) => {
        body = payload;
        return reply;
      },
    } as unknown as FastifyReply;
    const request = { params: { slug: "birthday-abcd1234" } } as unknown as FastifyRequest;
    await wishController.getWishBySlug(request, reply);
    assert.ok(!("viewCount" in body));
    assert.ok(!("deleteTokenHash" in body));
    assert.strictEqual(stored?.viewCount, 5);
  });
});
