// Routes that require an approved KYC/customer before they can be used.
// Dashboard and Settings are intentionally always accessible (Settings is
// where users complete verification).
export const GATED_PATHS = [
  "/accounts",
  "/deposit",
  "/withdraw",
  "/card",
  "/swap",
  "/earn",
] as const;

export function isGatedPath(pathname: string): boolean {
  return GATED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}
