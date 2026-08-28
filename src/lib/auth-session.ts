import { adminPath, safeAdminNext } from "@/lib/admin-path";

const TOKEN_KEY = "babit_access_token";
const TOKEN_EVENT = "babit-access-token-change";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

function notifyAccessTokenChange() {
  window.dispatchEvent(new Event(TOKEN_EVENT));
}

export function subscribeAccessToken(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === TOKEN_KEY || event.key === null) onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(TOKEN_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(TOKEN_EVENT, onStoreChange);
  };
}

export function setAccessToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
  notifyAccessTokenChange();
}

export function clearAccessToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
  notifyAccessTokenChange();
}

export function redirectToAdminLogin(): void {
  if (typeof window === "undefined") return;
  const loginPath = adminPath("/login");
  const currentPath = `${window.location.pathname}${window.location.search}`;
  if (window.location.pathname === loginPath || window.location.pathname.startsWith(`${loginPath}/`)) {
    return;
  }
  clearAccessToken();
  const next = safeAdminNext(currentPath);
  const params = new URLSearchParams();
  params.set("reason", "expired");
  if (next !== adminPath()) params.set("next", next);
  window.location.replace(`${loginPath}?${params.toString()}`);
}
