export interface PublicUrlInput {
  frontendUrl?: string;
  corsOrigin?: string;
  origin?: string;
  referer?: string;
}

const DEFAULT_URL = "http://localhost:3000";

/** Resolve the frontend base URL used to build public wish links (no trailing slash). */
export function resolvePublicBaseUrl(input: PublicUrlInput): string {
  const { frontendUrl, corsOrigin, origin, referer } = input;
  let baseUrl = frontendUrl && !frontendUrl.includes("localhost") ? frontendUrl : "";

  if (!baseUrl || baseUrl === "*") {
    baseUrl = "";
    if (origin && !origin.includes("localhost")) {
      baseUrl = origin;
    } else if (referer) {
      try {
        baseUrl = new URL(referer).origin;
      } catch {
        // ignore invalid referer URL
      }
    }
  }

  if (!baseUrl) {
    baseUrl = frontendUrl || corsOrigin || DEFAULT_URL;
  }

  return baseUrl.replace(/\/+$/, "");
}
