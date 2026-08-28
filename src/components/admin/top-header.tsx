"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/buttons";
import { SearchInput } from "@/components/ui/fields";
import { useTheme } from "@/components/theme/theme-provider";
import { useShell } from "@/components/admin/shell-state";
import { ADMIN_BASE, adminPath } from "@/lib/admin-path";

const labels: Record<string, string> = {
  "": "Dashboard",
  meal: "Meals",
  categories: "Categories",
  meals: "Meals",
  workout: "Workout",
  levels: "Levels",
  exercises: "Exercises",
  notifications: "Notifications",
  "fcm-overview": "FCM Overview",
  "workout-reminders": "Workout Reminders",
  devices: "Devices",
  "delivery-logs": "Delivery Logs",
  data: "Data Management",
  "import-csv": "Import CSV",
  "export-csv": "Export CSV",
  "raw-upload": "Raw Upload",
  jobs: "Job History",
  settings: "Account",
  "change-password": "Change Password",
  "api-keys": "API Keys",
  system: "System Status",
  new: "New",
  edit: "Edit",
};

function pretty(segment: string) {
  if (labels[segment]) return labels[segment];
  if (segment.length > 16) return "Details";
  return segment
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function TopHeader({ showRightToggle = false }: { showRightToggle?: boolean }) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { toggleSidebar, rightPanelOpen, setRightPanelOpen } = useShell();

  const crumbs = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean).filter((part) => part !== "admin");
    const items = [{ href: adminPath(), label: "Dashboards" }];
    let href = ADMIN_BASE;
    parts.forEach((part) => {
      href += `/${part}`;
      items.push({ href, label: pretty(part) });
    });
    if (parts.length === 0) items.push({ href: adminPath(), label: "Default" });
    return items;
  }, [pathname]);

  return (
    <header className="flex h-[var(--header-height)] shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--header-bg)] px-4 md:gap-4 md:px-6">
      <div className="flex min-w-0 items-center gap-1 md:gap-2">
        <IconButton aria-label="Toggle sidebar" onClick={toggleSidebar}>
          <Icon name="sidebar" size={16} />
        </IconButton>
        <IconButton aria-label="Favorite" className="hidden sm:inline-flex">
          <Icon name="star" size={16} />
        </IconButton>
        <nav className="typo-breadcrumb hidden min-w-0 items-center gap-2 md:flex">
          {crumbs.map((crumb, index) => (
            <span key={`${crumb.href}-${index}`} className="flex items-center gap-2">
              {index > 0 ? <span className="text-[var(--text-muted)]">/</span> : null}
              <Link
                href={crumb.href}
                className={index === crumbs.length - 1 ? "truncate text-ink" : "text-[var(--text-muted)]"}
              >
                {crumb.label}
              </Link>
            </span>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-1 md:gap-2">
        <SearchInput className="hidden w-[160px] lg:block" shortcut="⌘/" />
        <IconButton aria-label="Toggle theme" onClick={toggleTheme}>
          <Icon name={theme === "dark" ? "moon" : "sun"} size={16} />
        </IconButton>
        <IconButton aria-label="History" className="hidden sm:inline-flex">
          <Icon name="history" size={16} />
        </IconButton>
        <IconButton aria-label="Notifications" className="hidden sm:inline-flex">
          <Icon name="bell" size={16} />
        </IconButton>
        {showRightToggle ? (
          <IconButton
            aria-label="Toggle side panel"
            active={rightPanelOpen}
            className="hidden xl:inline-flex"
            onClick={() => setRightPanelOpen(!rightPanelOpen)}
          >
            <Icon name="sidebarSimple" size={16} />
          </IconButton>
        ) : null}
      </div>
    </header>
  );
}
