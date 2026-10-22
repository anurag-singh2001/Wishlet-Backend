process.env["DATABASE_URL"] ??= "postgresql://test:test@localhost:5432/test";
process.env["JWT_SECRET"] = "test-secret-test-secret-test-secret";

import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import type { FastifyInstance } from "fastify";
import { SignJWT } from "jose";
import { wishRepository } from "../repositories/wish.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { reactionRepository } from "../repositories/reaction.repository.js";
import { authService, type GoogleIdentity } from "../services/auth.service.js";
import { storageService } from "../services/storage.service.js";
import { signSessionToken } from "../utils/session-token.js";
import { hashDeleteToken } from "../utils/delete-token.js";

type Wish = NonNullable<Awaited<ReturnType<typeof wishRepository.findWishBySlug>>>;

const GOOGLE_OK: GoogleIdentity = {
  sub: "g-1",
  email: "a@example.com",
  emailVerified: true,
  name: "Ann",
  picture: "https://img/a.png",
};

function makeWish(over: Partial<Wish> = {}): Wish {
  return {
    id: "w1",
    slug: "birthday-aaaa1111",
    templateId: "birthday-minimal",
    occasion: "birthday",
    photoUrl: null,
    photoPublicId: null,
    deleteTokenHash: hashDeleteToken("tok"),
    content: { recipientName: "Sam" },
    viewCount: 3,
    expiresAt: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date(),
    ownerId: null,
    ...over,
  };
}

describe("auth and ownership", () => {
  let app: FastifyInstance;
  let wish: Wish | null;
  let google: GoogleIdentity | null;
  let deleted: string[];
  let created: Record<string, unknown> | null;
  let claimedIds: string[];
  const saved = {
    findBySlug: wishRepository.findWishBySlug,
    findById: wishRepository.findWishById,
    createWish: wishRepository.createWish,
    deleteWish: wishRepository.deleteWish,
    updateContent: wishRepository.updateContent,
    claimOwner: wishRepository.claimOwner,
    findOwnedActive: wishRepository.findOwnedActive,
    findExpired: wishRepository.findExpired,
    deleteExpired: wishRepository.deleteExpired,
    countRefs: wishRepository.countOtherReferences,
    upsertUser: userRepository.upsertByGoogleSub,
    findUser: userRepository.findById,
    counts: reactionRepository.countByReaction,
    verify: authService.verifyGoogleToken,
    deleteMedia: storageService.deleteMedia,
  };

  before(async () => {
    const { buildApp } = await import("../app.js");
    app = await buildApp();
    wishRepository.findWishBySlug = (async () => wish) as typeof wishRepository.findWishBySlug;
    wishRepository.findWishById = (async () => null) as typeof wishRepository.findWishById;
    wishRepository.createWish = (async (data: Record<string, unknown>) => {
      created = data;
      return makeWish({ slug: data["slug"] as string });
    }) as unknown as typeof wishRepository.createWish;
    wishRepository.deleteWish = (async (id: string) => {
      deleted.push(id);
      return wish;
    }) as unknown as typeof wishRepository.deleteWish;
    wishRepository.updateContent = (async () =>
      wish) as unknown as typeof wishRepository.updateContent;
    wishRepository.claimOwner = (async (id: string) => {
      claimedIds.push(id);
      return true;
    }) as typeof wishRepository.claimOwner;
    wishRepository.findOwnedActive = (async () => [
      makeWish(),
    ]) as typeof wishRepository.findOwnedActive;
    wishRepository.findExpired = (async () => []) as typeof wishRepository.findExpired;
    wishRepository.deleteExpired = (async () => 0) as typeof wishRepository.deleteExpired;
    wishRepository.countOtherReferences = (async () =>
      0) as typeof wishRepository.countOtherReferences;
    userRepository.upsertByGoogleSub = (async (p: { email: string; name: string | null }) => ({
      id: "u1",
      googleSub: "g-1",
      email: p.email,
      name: p.name,
      avatarUrl: "https://img/a.png",
      createdAt: new Date(),
      updatedAt: new Date(),
    })) as unknown as typeof userRepository.upsertByGoogleSub;
    userRepository.findById = (async (id: string) => ({
      id,
      googleSub: "g-1",
      email: "a@example.com",
      name: "Ann",
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })) as unknown as typeof userRepository.findById;
    reactionRepository.countByReaction = (async () => ({
      heart: 2,
    })) as typeof reactionRepository.countByReaction;
    authService.verifyGoogleToken = (async () => google) as typeof authService.verifyGoogleToken;
    storageService.deleteMedia = (async () => true) as typeof storageService.deleteMedia;
  });

  after(async () => {
    await app.close();
    wishRepository.findWishBySlug = saved.findBySlug;
    wishRepository.findWishById = saved.findById;
    wishRepository.createWish = saved.createWish;
    wishRepository.deleteWish = saved.deleteWish;
    wishRepository.updateContent = saved.updateContent;
    wishRepository.claimOwner = saved.claimOwner;
    wishRepository.findOwnedActive = saved.findOwnedActive;
    wishRepository.findExpired = saved.findExpired;
    wishRepository.deleteExpired = saved.deleteExpired;
    wishRepository.countOtherReferences = saved.countRefs;
    userRepository.upsertByGoogleSub = saved.upsertUser;
    userRepository.findById = saved.findUser;
    reactionRepository.countByReaction = saved.counts;
    authService.verifyGoogleToken = saved.verify;
    storageService.deleteMedia = saved.deleteMedia;
  });

  const reset = (): void => {
    wish = makeWish();
    google = GOOGLE_OK;
    deleted = [];
    created = null;
    claimedIds = [];
  };
  const bearer = async (id: string): Promise<Record<string, string>> => ({
    authorization: `Bearer ${await signSessionToken(id)}`,
  });

  test("google exchange returns a session for a verified token", async () => {
    reset();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/google",
      payload: { credential: "good" },
    });
    assert.strictEqual(res.statusCode, 200);
    const body = res.json() as { token: string; user: Record<string, unknown> };
    assert.deepStrictEqual(Object.keys(body.user).sort(), ["avatarUrl", "email", "id", "name"]);
    const me = await app.inject({
      method: "GET",
      url: "/api/v1/me",
      headers: { authorization: `Bearer ${body.token}` },
    });
    assert.strictEqual(me.statusCode, 200);
  });

  test("google exchange rejects invalid and unverified-email tokens", async () => {
    reset();
    google = null;
    let res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/google",
      payload: { credential: "x" },
    });
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual((res.json() as { error: string }).error, "INVALID_GOOGLE_TOKEN");
    google = { ...GOOGLE_OK, emailVerified: false };
    res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/google",
      payload: { credential: "x" },
    });
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual((res.json() as { error: string }).error, "INVALID_GOOGLE_TOKEN");
  });

  test("/me is 401 without or with a bad/expired session, 200 with a good one", async () => {
    reset();
    const none = await app.inject({ method: "GET", url: "/api/v1/me" });
    assert.strictEqual(none.statusCode, 401);
    assert.strictEqual((none.json() as { error: string }).error, "UNAUTHORIZED");
    const bad = await app.inject({
      method: "GET",
      url: "/api/v1/me",
      headers: { authorization: "Bearer not-a-jwt" },
    });
    assert.strictEqual(bad.statusCode, 401);
    const expired = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("u1")
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(new TextEncoder().encode(process.env["JWT_SECRET"]));
    const exp = await app.inject({
      method: "GET",
      url: "/api/v1/me",
      headers: { authorization: `Bearer ${expired}` },
    });
    assert.strictEqual(exp.statusCode, 401);
    const ok = await app.inject({ method: "GET", url: "/api/v1/me", headers: await bearer("u1") });
    assert.strictEqual(ok.statusCode, 200);
    assert.strictEqual((ok.json() as { user: { id: string } }).user.id, "u1");
  });

  test("/me/wishes lists summaries with reaction zeros", async () => {
    reset();
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/me/wishes",
      headers: await bearer("u1"),
    });
    assert.strictEqual(res.statusCode, 200);
    const [w] = (res.json() as { wishes: Record<string, unknown>[] }).wishes;
    assert.strictEqual(w?.["recipientName"], "Sam");
    assert.deepStrictEqual(w?.["reactions"], { heart: 2, moved: 0, party: 0, laugh: 0 });
    assert.strictEqual(w?.["reactionsEnabled"], true);
    assert.strictEqual(w?.["viewCount"], 3);
  });

  test("create requires a session and sets the owner", async () => {
    reset();
    const payload = { templateId: "birthday-minimal", occasion: "birthday", content: {} };
    const guest = await app.inject({ method: "POST", url: "/api/v1/wishes", payload });
    assert.strictEqual(guest.statusCode, 401);
    assert.deepStrictEqual(guest.json(), {
      error: "UNAUTHORIZED",
      message: "Sign in to create a wish.",
    });
    assert.strictEqual(created, null);
    const mine = await app.inject({
      method: "POST",
      url: "/api/v1/wishes",
      payload,
      headers: await bearer("u1"),
    });
    assert.strictEqual(mine.statusCode, 201);
    assert.deepStrictEqual(created?.["owner"], { connect: { id: "u1" } });
    assert.ok((mine.json() as { deleteToken?: string }).deleteToken);
  });

  test("upload endpoints require a session", async () => {
    reset();
    for (const [method, url] of [
      ["POST", "/api/v1/uploads/signature"],
      ["GET", "/api/v1/uploads/signature"],
      ["POST", "/api/v1/uploads/image"],
    ] as const) {
      const res = await app.inject({ method, url });
      assert.strictEqual(res.statusCode, 401, `${method} ${url}`);
      assert.strictEqual((res.json() as { error: string }).error, "UNAUTHORIZED");
    }
  });

  test("claim attaches only unowned wishes with a valid token", async () => {
    reset();
    const headers = await bearer("u1");
    const claim = async (token: string): Promise<number> => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/me/wishes/claim",
        headers,
        payload: { wishes: [{ slug: "birthday-aaaa1111", token }] },
      });
      assert.strictEqual(res.statusCode, 200);
      return (res.json() as { claimed: number }).claimed;
    };
    assert.strictEqual(await claim("wrong"), 0);
    wish = makeWish({ ownerId: "someone-else" });
    assert.strictEqual(await claim("tok"), 0);
    assert.deepStrictEqual(claimedIds, []);
    wish = makeWish();
    assert.strictEqual(await claim("tok"), 1);
    assert.deepStrictEqual(claimedIds, ["w1"]);
    const anon = await app.inject({
      method: "POST",
      url: "/api/v1/me/wishes/claim",
      payload: { wishes: [] },
    });
    assert.strictEqual(anon.statusCode, 401);
  });

  test("owner can stats, change settings and delete without a delete token", async () => {
    reset();
    wish = makeWish({ ownerId: "u1" });
    const headers = await bearer("u1");
    const stats = await app.inject({
      method: "GET",
      url: "/api/v1/wishes/birthday-aaaa1111/stats",
      headers,
    });
    assert.strictEqual(stats.statusCode, 200);
    const settings = await app.inject({
      method: "PATCH",
      url: "/api/v1/wishes/birthday-aaaa1111/settings",
      headers,
      payload: { reactionsEnabled: false },
    });
    assert.strictEqual(settings.statusCode, 200);
    const del = await app.inject({
      method: "DELETE",
      url: "/api/v1/wishes/birthday-aaaa1111",
      headers,
    });
    assert.strictEqual(del.statusCode, 200);
    assert.deepStrictEqual(deleted, ["w1"]);
  });

  test("a non-owner session gets 403; no credentials stays 400; token still works", async () => {
    reset();
    wish = makeWish({ ownerId: "u1" });
    const other = await bearer("u2");
    const url = "/api/v1/wishes/birthday-aaaa1111/stats";
    assert.strictEqual((await app.inject({ method: "GET", url, headers: other })).statusCode, 403);
    assert.strictEqual((await app.inject({ method: "GET", url })).statusCode, 400);
    const withToken = await app.inject({
      method: "GET",
      url,
      headers: { ...other, "x-delete-token": "tok" },
    });
    assert.strictEqual(withToken.statusCode, 200);
    const del = await app.inject({
      method: "DELETE",
      url: "/api/v1/wishes/birthday-aaaa1111",
      headers: other,
    });
    assert.strictEqual(del.statusCode, 403);
    assert.deepStrictEqual(deleted, []);
  });

  test("public routes ignore a bad token and never expose the owner", async () => {
    reset();
    wish = makeWish({ ownerId: "u1" });
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/wishes/birthday-aaaa1111",
      headers: { authorization: "Bearer garbage" },
    });
    assert.strictEqual(res.statusCode, 200);
    assert.ok(!("ownerId" in (res.json() as object)));
  });
});
