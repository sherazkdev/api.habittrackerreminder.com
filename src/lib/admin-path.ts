/** Admin panel URL prefix — all protected routes live under `/admin`. */
export const ADMIN_BASE = "/admin";

/** Build an admin route path. `adminPath()` → `/admin`, `adminPath("/meal/meals")` → `/admin/meal/meals`. */
export function adminPath(subpath = ""): string {
  if (!subpath || subpath === "/") return ADMIN_BASE;
  const normalized = subpath.startsWith("/") ? subpath : `/${subpath}`;
  return `${ADMIN_BASE}${normalized}`;
}

export function isAdminDashboard(pathname: string): boolean {
  return pathname === ADMIN_BASE;
}

/** Only allow in-app admin return URLs (blocks open redirects and login loops). */
export function safeAdminNext(next: string | null | undefined): string {
  if (!next) return ADMIN_BASE;
  const value = next.trim();
  if (!value.startsWith(ADMIN_BASE)) return ADMIN_BASE;
  if (value.startsWith("//") || value.includes("://")) return ADMIN_BASE;
  if (value === `${ADMIN_BASE}/login` || value.startsWith(`${ADMIN_BASE}/login?`)) return ADMIN_BASE;
  return value;
}
