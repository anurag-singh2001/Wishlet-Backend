import { test, describe } from "node:test";
import assert from "node:assert";
import { wishService } from "../services/wish.service.js";
import { wishRepository, WishRepository } from "../repositories/wish.repository.js";
import { Prisma } from "@prisma/client";
import { ApiError } from "../plugins/error-handler.js";

type WishRecord = Awaited<ReturnType<WishRepository["createWish"]>>;

describe("Wishlet Slug Architecture", () => {
  test("generates unique URL-safe slugs", async () => {
    // Save original method
    const originalCreate = wishRepository.createWish;
    const originalIsTaken = wishRepository.isSlugTaken;
    
    try {
      // Mock repository methods
      wishRepository.createWish = (async (data: Prisma.WishCreateInput) => ({
        id: "test-id",
        slug: data.slug,
        templateId: data.templateId,
        occasion: data.occasion,
        content: data.content ?? {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })) as unknown as typeof wishRepository.createWish;
      wishRepository.isSlugTaken = async () => false;

      const result = await wishService.createWish({
        templateId: "birthday-minimal",
        occasion: "birthday?!@",
        content: {}
      });

      // Should sanitize occasion
      assert.ok(result.slug.startsWith("birthday"));
      assert.ok(!result.slug.includes("?"));
      assert.ok(!result.slug.includes("!"));
      
      // Fallback fallback check
      const fallbackResult = await wishService.createWish({
        templateId: "birthday-minimal",
        occasion: "???",
        content: {}
      });
      assert.ok(fallbackResult.slug.startsWith("wish-"));
    } finally {
      // Restore
      wishRepository.createWish = originalCreate;
      wishRepository.isSlugTaken = originalIsTaken;
    }
  });

  test("handles extremely unlikely slug collisions with bounded retry", async () => {
    const originalCreate = wishRepository.createWish;
    let attempts = 0;

    try {
      // Mock createWish to throw a P2002 (Unique Constraint) error twice, then succeed
      wishRepository.createWish = (async (data: Prisma.WishCreateInput) => {
        attempts++;
        if (attempts <= 2) {
          throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
            code: "P2002",
            clientVersion: "6.0.0"
          });
        }
        return {
          id: "test-id",
          slug: data.slug,
          templateId: data.templateId,
          occasion: data.occasion,
          content: data.content ?? {},
          createdAt: new Date(),
          updatedAt: new Date(),
        } as unknown as WishRecord;
      }) as unknown as typeof wishRepository.createWish;

      const result = await wishService.createWish({
        templateId: "test",
        occasion: "test",
        content: {}
      });

      // Should succeed on the 3rd attempt
      assert.strictEqual(attempts, 3);
      assert.ok(result.slug.startsWith("test-"));
    } finally {
      wishRepository.createWish = originalCreate;
    }
  });

  test("throws 500 when bounded retry limit is reached", async () => {
    const originalCreate = wishRepository.createWish;
    let attempts = 0;

    try {
      // Mock createWish to always throw P2002
      wishRepository.createWish = (async () => {
        attempts++;
        throw new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
          code: "P2002",
          clientVersion: "6.0.0"
        });
      }) as unknown as typeof wishRepository.createWish;

      await assert.rejects(
        async () => {
          await wishService.createWish({
            templateId: "test",
            occasion: "test",
            content: {}
          });
        },
        (err: unknown) => {
          assert.strictEqual(attempts, 3);
          assert.ok(err instanceof ApiError);
          assert.strictEqual(err.statusCode, 500);
          assert.strictEqual(err.errorCode, "SLUG_GENERATION_FAILED");
          return true;
        }
      );
    } finally {
      wishRepository.createWish = originalCreate;
    }
  });
});
