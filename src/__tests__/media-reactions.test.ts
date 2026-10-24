import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { wishService } from "../services/wish.service.js";
import { mediaService } from "../services/media.service.js";
import { reactionService } from "../services/reaction.service.js";
import { storageService } from "../services/storage.service.js";
import { wishRepository } from "../repositories/wish.repository.js";
import { reactionRepository } from "../repositories/reaction.repository.js";
import { ReactBodySchema } from "../schemas/wish.schema.js";
import { ApiError } from "../plugins/error-handler.js";
import { env } from "../config/env.js";

const CLOUD = "democloud";
const PHOTO_ID = "wishlet/wishes/abc";
const VOICE_ID = "wishlet/voice/xyz";
const photoUrl = `https://res.cloudinary.com/${CLOUD}/image/upload/v1/${PHOTO_ID}.jpg`;
const voiceUrl = `https://res.cloudinary.com/${CLOUD}/video/upload/v1/${VOICE_ID}.webm`;
const VOTER = "5f9f1b0e-6a3e-4f5d-9a6f-0a1b2c3d4e5f";

type Asset = { bytes: number; duration: number | null; format: string } | null;

const code = (status: number, errorCode: string) => (e: unknown) =>
  e instanceof ApiError && e.statusCode === status && e.errorCode === errorCode;

describe("media validation on create", () => {
  const saved = {
    cloud: env.CLOUDINARY_CLOUD_NAME,
    configured: Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(storageService),
      "configured",
    ),
    getVoiceAsset: storageService.getVoiceAsset,
  };
  let configured = true;
  let asset: Asset;

  beforeEach(() => {
    env.CLOUDINARY_CLOUD_NAME = CLOUD;
    configured = true;
    asset = { bytes: 1000, duration: 12.34, format: "webm" };
    Object.defineProperty(storageService, "configured", {
      get: () => configured,
      configurable: true,
    });
    storageService.getVoiceAsset = (async () => asset) as typeof storageService.getVoiceAsset;
  });

  afterEach(() => {
    env.CLOUDINARY_CLOUD_NAME = saved.cloud;
    delete (storageService as unknown as Record<string, unknown>)["configured"];
    storageService.getVoiceAsset = saved.getVoiceAsset;
  });

  test("keeps a photo id under our folder that matches a Cloudinary URL", async () => {
    const r = await mediaService.sanitize({ photos: [photoUrl], photoPublicId: PHOTO_ID });
    assert.strictEqual(r.photoPublicId, PHOTO_ID);
  });

  test("silently drops foreign, local and mismatched photo ids", async () => {
    for (const content of [
      { photos: [photoUrl], photoPublicId: "someone/else" },
      { photos: ["data:image/png;base64,AAA"], photoPublicId: "local_dev_1" },
      { photos: ["https://evil.example/x.jpg"], photoPublicId: PHOTO_ID },
      { photos: [photoUrl], photoPublicId: "wishlet/wishes/other" },
    ]) {
      const r = await mediaService.sanitize(content);
      assert.strictEqual(r.photoPublicId, null);
      assert.ok(!("photoPublicId" in r.content));
    }
  });

  test("accepts a valid voice and stores the measured duration", async () => {
    const r = await mediaService.sanitize({
      voiceUrl,
      voicePublicId: VOICE_ID,
      voiceDuration: 1,
    });
    assert.strictEqual(r.content["voiceDuration"], 12.3);
  });

  test("WebM without a Cloudinary duration falls back to the recorder's length", async () => {
    asset = { bytes: 302654, duration: null, format: "webm" };
    const ok = await mediaService.sanitize({
      voiceUrl,
      voicePublicId: VOICE_ID,
      voiceDuration: 9.46,
    });
    assert.strictEqual(ok.content["voiceDuration"], 9.5);
    for (const voiceDuration of [undefined, 0, 75, "10"]) {
      await assert.rejects(
        mediaService.sanitize({ voiceUrl, voicePublicId: VOICE_ID, voiceDuration }),
        code(400, "INVALID_VOICE"),
      );
    }
  });

  test("rejects invalid voice (foreign id, bad url, too long, too big, bad format)", async () => {
    const base = { voiceUrl, voicePublicId: VOICE_ID };
    const bad: Record<string, unknown>[] = [
      { ...base, voicePublicId: "other/id" },
      { ...base, voiceUrl: "https://evil.example/a.webm" },
    ];
    for (const content of bad) {
      await assert.rejects(mediaService.sanitize(content), code(400, "INVALID_VOICE"));
    }
    for (const a of [
      { bytes: 1000, duration: 62, format: "webm" },
      { bytes: 3 * 1024 * 1024, duration: 5, format: "webm" },
      { bytes: 1000, duration: 5, format: "exe" },
      null,
    ]) {
      asset = a;
      await assert.rejects(mediaService.sanitize(base), code(400, "INVALID_VOICE"));
    }
  });

  test("voice without Cloudinary configured gives VOICE_UPLOAD_UNAVAILABLE", async () => {
    configured = false;
    await assert.rejects(
      mediaService.sanitize({ voiceUrl, voicePublicId: VOICE_ID }),
      code(400, "VOICE_UPLOAD_UNAVAILABLE"),
    );
  });

  test("public content strips asset ids", () => {
    const out = mediaService.stripPrivate({
      photoPublicId: PHOTO_ID,
      voicePublicId: VOICE_ID,
      voiceUrl,
    });
    assert.deepStrictEqual(out, { voiceUrl });
  });
});

describe("shared asset deletion", () => {
  const orig = {
    findWishById: wishRepository.findWishById,
    findWishBySlug: wishRepository.findWishBySlug,
    deleteWish: wishRepository.deleteWish,
    count: wishRepository.countOtherReferences,
    deleteMedia: storageService.deleteMedia,
  };
  let refs = 0;
  let destroyed: [string, string][];

  beforeEach(() => {
    refs = 0;
    destroyed = [];
    wishRepository.findWishById = (async () => null) as typeof wishRepository.findWishById;
    wishRepository.findWishBySlug = (async () => ({
      id: "w1",
      deleteTokenHash: null,
      photoPublicId: PHOTO_ID,
      content: { voicePublicId: VOICE_ID },
    })) as unknown as typeof wishRepository.findWishBySlug;
    wishRepository.deleteWish = (async () => null) as unknown as typeof wishRepository.deleteWish;
    wishRepository.countOtherReferences = (async () =>
      refs) as typeof wishRepository.countOtherReferences;
    storageService.deleteMedia = (async (id: string, type: string) => {
      destroyed.push([id, type]);
      return true;
    }) as typeof storageService.deleteMedia;
  });

  afterEach(() => {
    wishRepository.findWishById = orig.findWishById;
    wishRepository.findWishBySlug = orig.findWishBySlug;
    wishRepository.deleteWish = orig.deleteWish;
    wishRepository.countOtherReferences = orig.count;
    storageService.deleteMedia = orig.deleteMedia;
  });

  const token = "tok";
  const withToken = async () => {
    const { createHash } = await import("node:crypto");
    (await wishRepository.findWishBySlug("s")) as unknown as { deleteTokenHash: string };
    wishRepository.findWishBySlug = (async () => ({
      id: "w1",
      deleteTokenHash: createHash("sha256").update(token).digest("hex"),
      photoPublicId: PHOTO_ID,
      content: { voicePublicId: VOICE_ID },
    })) as unknown as typeof wishRepository.findWishBySlug;
  };

  test("destroys photo (image) and voice (video) when unreferenced", async () => {
    await withToken();
    await wishService.deleteWish("s", { deleteToken: token });
    assert.deepStrictEqual(destroyed, [
      [PHOTO_ID, "image"],
      [VOICE_ID, "video"],
    ]);
  });

  test("keeps assets still referenced by another wish", async () => {
    await withToken();
    refs = 1;
    await wishService.deleteWish("s", { deleteToken: token });
    assert.deepStrictEqual(destroyed, []);
  });
});

describe("reactions", () => {
  const orig = {
    findWishBySlug: wishRepository.findWishBySlug,
    upsert: reactionRepository.upsert,
    remove: reactionRepository.remove,
    count: reactionRepository.countByReaction,
    updateContent: wishRepository.updateContent,
  };
  let wish: Record<string, unknown> | null;
  let calls: string[];

  beforeEach(() => {
    calls = [];
    wish = { id: "w1", content: {}, expiresAt: null, deleteTokenHash: null };
    wishRepository.findWishBySlug = (async () =>
      wish) as unknown as typeof wishRepository.findWishBySlug;
    reactionRepository.upsert = (async (_w: string, h: string, r: string) => {
      calls.push(`set:${r}:${h.length}`);
    }) as typeof reactionRepository.upsert;
    reactionRepository.remove = (async () => {
      calls.push("clear");
    }) as typeof reactionRepository.remove;
    reactionRepository.countByReaction = (async () => ({
      heart: 2,
    })) as typeof reactionRepository.countByReaction;
  });

  afterEach(() => {
    wishRepository.findWishBySlug = orig.findWishBySlug;
    wishRepository.updateContent = orig.updateContent;
    reactionRepository.upsert = orig.upsert;
    reactionRepository.remove = orig.remove;
    reactionRepository.countByReaction = orig.count;
  });

  test("sets, changes and clears a reaction", async () => {
    assert.deepStrictEqual(await reactionService.react("s", "heart", VOTER), { reaction: "heart" });
    await reactionService.react("s", "party", VOTER);
    assert.deepStrictEqual(await reactionService.react("s", null, VOTER), { reaction: null });
    assert.deepStrictEqual(calls, ["set:heart:64", "set:party:64", "clear"]);
  });

  test("403 when disabled, 410 when expired, 404 when missing", async () => {
    wish = { id: "w1", content: { reactionsEnabled: false }, expiresAt: null };
    await assert.rejects(
      reactionService.react("s", "heart", VOTER),
      code(403, "REACTIONS_DISABLED"),
    );
    wish = { id: "w1", content: {}, expiresAt: new Date(Date.now() - 1000) };
    await assert.rejects(reactionService.react("s", "heart", VOTER), code(410, "EXPIRED"));
    wish = null;
    await assert.rejects(reactionService.react("s", "heart", VOTER), code(404, "NOT_FOUND"));
  });

  test("body validation rejects bad emoji and voter id", () => {
    assert.ok(ReactBodySchema.safeParse({ reaction: "heart", voterId: VOTER }).success);
    assert.ok(ReactBodySchema.safeParse({ reaction: null, voterId: VOTER }).success);
    assert.ok(!ReactBodySchema.safeParse({ reaction: "angry", voterId: VOTER }).success);
    assert.ok(!ReactBodySchema.safeParse({ reaction: "heart", voterId: "nope" }).success);
  });

  test("stats include zero-filled counts and reactionsEnabled", async () => {
    const { createHash } = await import("node:crypto");
    wish = {
      id: "w1",
      content: { reactionsEnabled: false },
      deleteTokenHash: createHash("sha256").update("tok").digest("hex"),
      viewCount: 0,
    };
    const stats = await wishService.getWishStats("s", { deleteToken: "tok" });
    assert.deepStrictEqual(stats.reactions, { heart: 2, moved: 0, party: 0, laugh: 0 });
    assert.strictEqual(stats.reactionsEnabled, false);
  });

  test("settings require a valid token and update content", async () => {
    const { createHash } = await import("node:crypto");
    wish = {
      id: "w1",
      content: { message: "hi" },
      deleteTokenHash: createHash("sha256").update("tok").digest("hex"),
    };
    let saved: unknown = null;
    wishRepository.updateContent = (async (_id: string, c: unknown) => {
      saved = c;
    }) as unknown as typeof wishRepository.updateContent;
    await assert.rejects(
      wishService.updateSettings("s", { deleteToken: "bad" }, false),
      code(403, "FORBIDDEN"),
    );
    assert.strictEqual(saved, null);
    assert.deepStrictEqual(await wishService.updateSettings("s", { deleteToken: "tok" }, false), {
      reactionsEnabled: false,
    });
    assert.deepStrictEqual(saved, { message: "hi", reactionsEnabled: false });
  });
});
