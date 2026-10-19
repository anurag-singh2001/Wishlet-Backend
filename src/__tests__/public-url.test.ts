import { test } from "node:test";
import assert from "node:assert/strict";
import { resolvePublicBaseUrl } from "../utils/public-url.js";

test("env FRONTEND_URL wins over headers", () => {
  const url = resolvePublicBaseUrl({
    frontendUrl: "https://wishlet.app",
    origin: "https://other.app",
  });
  assert.equal(url, "https://wishlet.app");
});

test("localhost origin is ignored in favour of referer", () => {
  const url = resolvePublicBaseUrl({
    frontendUrl: "http://localhost:3000",
    origin: "http://localhost:3000",
    referer: "https://pre.vercel.app/create?x=1",
  });
  assert.equal(url, "https://pre.vercel.app");
});

test("non-localhost origin used when env is localhost", () => {
  const url = resolvePublicBaseUrl({
    frontendUrl: "http://localhost:3000",
    origin: "https://abc.app",
  });
  assert.equal(url, "https://abc.app");
});

test("falls back to localhost default and strips trailing slashes", () => {
  assert.equal(resolvePublicBaseUrl({}), "http://localhost:3000");
  assert.equal(resolvePublicBaseUrl({ frontendUrl: "https://wishlet.app//" }), "https://wishlet.app");
});
