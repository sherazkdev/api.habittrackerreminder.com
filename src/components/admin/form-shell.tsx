"use client";

import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/buttons";
import { useTheme } from "@/components/theme/theme-provider";

export function FormShell({ children }: { children: ReactNode }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex min-h-screen flex-col bg-[var(--page-bg)]">
      <header className="flex h-[var(--header-height)] shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--header-bg)] px-7">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-full bg-[var(--pastel-blue)] text-[var(--static-black)]">
            <Icon name="leaf" size={14} />
          </span>
          <div>
            <p className="text-[14px] font-semibold leading-5">WeightLoss Pro</p>
            <p className="text-[12px] leading-[18px] text-[var(--text-muted)]">Admin Panel</p>
          </div>
        </div>
        <IconButton aria-label="Toggle theme" onClick={toggleTheme}>
          <Icon name={theme === "dark" ? "moon" : "sun"} size={16} />
        </IconButton>
      </header>
      <main className="flex-1 px-5 py-6 md:px-8">{children}</main>
    </div>
  );
}

export function isFormRoute(pathname: string) {
  return pathname.endsWith("/new") || pathname.endsWith("/edit");
}
