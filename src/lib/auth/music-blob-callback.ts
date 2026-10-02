const MUSIC_BLOB_CALLBACK_PATHS = new Set([
  "/api/music/upload",
  "/api/music/artwork/upload",
]);

/**
 * Vercel Blob completion callbacks have no browser session. This only lets the
 * request reach the route; @vercel/blob verifies x-vercel-signature before
 * invoking the callback that writes to the account catalog.
 */
export function isMusicBlobCallbackRequest(method: string, pathname: string, signature: string | null): boolean {
  return method === "POST" && MUSIC_BLOB_CALLBACK_PATHS.has(pathname) && Boolean(signature?.trim());
}
