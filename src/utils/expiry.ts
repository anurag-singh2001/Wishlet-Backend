import { ApiError } from "../plugins/error-handler.js";

/**
 * Expired wishes answer 410 on every read; purgeExpired() deletes them later. Deleting on
 * read would turn the recipient's own request into a 404, because the page's server-side
 * metadata fetch runs first.
 */
export function rejectIfExpired(wish: { expiresAt: Date | null }): void {
  if (!wish.expiresAt || wish.expiresAt.getTime() >= Date.now()) return;
  throw new ApiError(410, "EXPIRED", "This wish has expired.");
}
