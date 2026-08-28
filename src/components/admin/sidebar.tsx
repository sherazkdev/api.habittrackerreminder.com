"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/lib/icons";
import { useShell } from "@/components/admin/shell-state";
import { logout } from "@/lib/auth-api";
import { clearAccessToken } from "@/lib/auth-session";
import { ADMIN_BASE, adminPath } from "@/lib/admin-path";

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
};

type NavSection = {
  id: string;
  label: string;
  items: NavItem[];
};

const sections: NavSection[] = [
  {
    id: "overview",
    label: "Dashboards",
    items: [{ href: ADMIN_BASE, label: "Dashboard", icon: "dashboard" }],
  },
  {
    id: "notifications",
    label: "Notifications",
    items: [
      { href: adminPath("/notifications/fcm-overview"), label: "FCM Overview", icon: "broadcast" },
    ],
  },
  {
    id: "account",
    label: "Account",
    items: [
      { href: adminPath("/settings/system"), label: "System Status", icon: "heartbeat" },
      { href: adminPath("/settings/api-keys"), label: "API Keys", icon: "lock" },
      { href: adminPath("/settings/change-password"), label: "Change Password", icon: "password" },
      { href: "/docs", label: "API Docs", icon: "list" },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === ADMIN_BASE) return pathname === ADMIN_BASE;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavTooltip({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (!collapsed) return null;
  return (
    <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 hidden -translate-y-1/2 whitespace-nowrap rounded-[8px] bg-[var(--text-primary)] px-2 py-1 text-[12px] leading-[18px] text-[var(--page-bg)] group-hover:block">
      {label}
    </span>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarOpen, setSidebarOpen, sidebarCollapsed } = useShell();
  const [navTab, setNavTab] = useState<"favorites" | "recently">("favorites");
  const [signingOut, setSigningOut] = useState(false);
  const collapsed = sidebarCollapsed;
  const shortcutLinks =
    navTab === "favorites"
      ? [
          { href: ADMIN_BASE, label: "Dashboard" },
          { href: adminPath("/notifications/fcm-overview"), label: "FCM Overview" },
        ]
      : [
          { href: adminPath("/settings/api-keys"), label: "API Keys" },
          { href: adminPath("/settings/change-password"), label: "Change Password" },
        ];

  return (
    <>
      {sidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-[var(--modal-overlay)] xl:hidden"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex h-full flex-col border-r border-[var(--border)] bg-[var(--sidebar-bg)] py-5 transition-[width,transform] duration-200 xl:static xl:h-full xl:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          collapsed
            ? "w-[var(--sidebar-width)] px-4 xl:w-[var(--sidebar-collapsed-width)] xl:px-2"
            : "w-[var(--sidebar-width)] px-4",
        )}
      >
        <div className={cn("mb-5 flex items-center gap-2", collapsed ? "xl:justify-center xl:px-0" : "px-1")}>
          <span className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--pastel-blue)] text-[var(--static-black)]">
            <Icon name="leaf" size={14} />
          </span>
          <p className={cn("truncate text-[14px] leading-5", collapsed && "xl:hidden")}>Habit Tracker</p>
        </div>

        <div className={cn("mb-5 px-1", collapsed && "xl:hidden")}>
          <div className="mb-1 flex items-center gap-4">
            <button
              type="button"
              onClick={() => setNavTab("favorites")}
              className={cn(
                "text-[12px] leading-[18px]",
                navTab === "favorites" ? "text-[var(--text-muted)]" : "text-[var(--text-disabled)]",
              )}
            >
              Favorites
            </button>
            <button
              type="button"
              onClick={() => setNavTab("recently")}
              className={cn(
                "text-[12px] leading-[18px]",
                navTab === "recently" ? "text-[var(--text-muted)]" : "text-[var(--text-disabled)]",
              )}
            >
              Recently
            </button>
          </div>
          <div className="flex flex-col gap-0.5">
            {shortcutLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex h-7 items-center gap-2 rounded-[8px] px-2 text-[14px] leading-5 text-[var(--text-secondary)] hover:bg-[var(--nav-hover-bg)]"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="size-1 rounded-full bg-[var(--text-muted)]" />
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="relative min-h-0 flex-1">
          <nav className="absolute inset-0 overflow-x-hidden overflow-y-auto scrollbar-thin">
          {sections.map((section) => (
            <div key={section.id} className="mb-4">
              <p className={cn("typo-section-nav mb-1 px-1", collapsed && "xl:hidden")}>{section.label}</p>
              {collapsed ? <div className="mb-1 hidden h-px bg-[var(--border)] xl:block" /> : null}
              <div className="flex flex-col gap-0.5">
                {section.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.label}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "nav-item group relative flex items-center rounded-[8px] text-[14px] leading-5",
                        collapsed ? "h-8 xl:justify-center xl:px-0" : "h-7 gap-1 px-2",
                        active && "nav-item-active",
                      )}
                    >
                      {active ? (
                        <span
                          className={cn(
                            "absolute top-1/2 h-4 w-1 -translate-y-1/2 rounded-r-[4px] bg-[var(--nav-active-bar)]",
                            collapsed ? "left-0 xl:left-1" : "left-0",
                          )}
                        />
                      ) : null}
                      <Icon name={item.icon} size={16} />
                      <span className={cn("truncate", collapsed && "xl:hidden")}>{item.label}</span>
                      <NavTooltip label={item.label} collapsed={collapsed} />
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
          </nav>
        </div>
        <div className={cn("mt-auto flex flex-col gap-2 px-1 pt-4", collapsed && "xl:items-center")}>
          <button
            type="button"
            disabled={signingOut}
            onClick={() => {
              setSigningOut(true);
              void (async () => {
                try {
                  await logout();
                } catch {
                  /* cookie may already be cleared */
                } finally {
                  clearAccessToken();
                  router.replace(adminPath("/login"));
                }
              })();
            }}
            className={cn(
              "nav-item group relative flex items-center rounded-[8px] text-[14px] leading-5 text-[var(--text-muted)] hover:text-ink",
              collapsed ? "h-8 xl:justify-center xl:px-0" : "h-7 gap-1 px-2",
            )}
          >
            <Icon name="lock" size={16} />
            <span className={cn("truncate", collapsed && "xl:hidden")}>
              {signingOut ? "Signing out…" : "Sign out"}
            </span>
            <NavTooltip label="Sign out" collapsed={collapsed} />
          </button>
          <div className={cn("flex items-center gap-2 px-1", collapsed && "xl:justify-center xl:px-0")}>
            <span className="flex size-5 shrink-0 items-center justify-center text-[var(--bright-purple)]">
              <Icon name="snowflake" size={16} />
            </span>
            <p className={cn("text-[12px] leading-[18px] text-[var(--text-muted)]", collapsed && "xl:hidden")}>
              snowui
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
