"use client";

import type { ReactNode } from "react";
import { Sidebar } from "@/components/admin/sidebar";
import { TopHeader } from "@/components/admin/top-header";
import { RightPanel } from "@/components/admin/right-panel";
import { ShellStateProvider, useShell } from "@/components/admin/shell-state";
import { cn } from "@/lib/cn";

function ShellInner({
  children,
  withRightPanel,
}: {
  children: ReactNode;
  withRightPanel: boolean;
}) {
  const { rightPanelOpen } = useShell();
  return (
    <div className="flex h-full min-h-0 bg-[var(--page-bg)]">
      <Sidebar />
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <TopHeader showRightToggle={withRightPanel} />
        <div className="flex min-h-0 min-w-0 flex-1">
          <main className="wl-page-scroll min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
            <div className="flex min-h-full flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-6 md:py-5">
              <div className="min-w-0 flex-1">{children}</div>
              <footer className="mt-auto flex shrink-0 flex-wrap items-center justify-between gap-2 pt-4 text-[12px] leading-[18px] text-[var(--text-muted)]">
                <span>© 2026 Habit Tracker</span>
                <span className="flex gap-4">
                  <span>About</span>
                  <span>Support</span>
                  <span>Contact Us</span>
                </span>
              </footer>
            </div>
          </main>
          {withRightPanel ? (
            <div
              className={cn(
                "relative hidden h-full w-[var(--right-panel-width)] shrink-0 xl:block",
                !rightPanelOpen && "xl:hidden",
              )}
            >
              <RightPanel />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function AdminShell({
  children,
  withRightPanel = false,
}: {
  children: ReactNode;
  withRightPanel?: boolean;
}) {
  return (
    <ShellStateProvider defaultRightPanel={withRightPanel}>
      <ShellInner withRightPanel={withRightPanel}>{children}</ShellInner>
    </ShellStateProvider>
  );
}
