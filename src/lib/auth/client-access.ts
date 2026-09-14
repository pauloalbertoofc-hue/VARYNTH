export type VarynthRole = "owner" | "developer" | "member";

export const CLIENT_ALLOWED_PATHS = [
  "/dashboard",
  "/download",
  "/profile",
  "/modules/athena",
  "/modules/music",
  "/modules/studio",
  "/modules/vault",
] as const;

export function isClientRole(role: unknown): role is "member" {
  return role === "member";
}

export function isClientPath(pathname: string) {
  return CLIENT_ALLOWED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function isClientApiPath(pathname: string) {
  return ["/api/app-icon", "/api/platform/preferences", "/api/account/preferences", "/api/athena/conversations", "/api/vault/"].some((path) => pathname === path || pathname.startsWith(path));
}
