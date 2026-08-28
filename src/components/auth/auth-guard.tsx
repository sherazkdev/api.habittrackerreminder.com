"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { adminPath, safeAdminNext } from "@/lib/admin-path";
import { getAccessToken, subscribeAccessToken } from "@/lib/auth-session";

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const token = useSyncExternalStore(subscribeAccessToken, getAccessToken, () => null);

  useEffect(() => {
    if (token) return;
    router.replace(`${adminPath("/login")}?next=${encodeURIComponent(safeAdminNext(pathname))}`);
  }, [pathname, router, token]);

  if (!token) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-[14px] text-[var(--text-muted)]">
        Checking session…
      </div>
    );
  }

  return children;
}
