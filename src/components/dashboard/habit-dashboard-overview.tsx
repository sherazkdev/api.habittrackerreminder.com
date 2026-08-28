"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { SecondaryButton } from "@/components/ui/buttons";
import { ApiError } from "@/lib/api-client";
import { adminPath } from "@/lib/admin-path";
import { useDeferredEffect } from "@/lib/use-deferred-effect";
import type { IconName } from "@/lib/icons";
import { apiGet } from "@/lib/api-client";
import { useCallback, useRef, useState } from "react";
import { FcmDeliveryChart } from "@/components/notifications/fcm-overview-panels";
import { DistributionDonut } from "@/components/dashboard/recharts-charts";
import { cn } from "@/lib/cn";

type DashboardStats = {
  users: number;
  reminders: number;
  registeredDevices: number;
  deliveriesToday: number;
  deliveredToday?: number;
  failedToday?: number;
  skippedToday?: number;
  deliveryRatePercent?: number;
  usersWithDevices?: number;
  timerReminders?: number;
  repeatReminders?: number;
  weekDelta?: number;
  weekChart?: Array<{ date: string; label: string; delivered: number; failed: number; sent: number }>;
  statusBreakdown?: Array<{ label: string; value: number; color: string }>;
  reminderModes?: Array<{ label: string; value: number; color: string }>;
  recentDeliveries?: Array<{ id: string; habitName: string; status: string; createdAt: string }>;
  stale?: boolean;
  cached?: boolean;
};

function StatTile({
  href,
  icon,
  label,
  value,
  hint,
  tone,
}: {
  href: string;
  icon: IconName;
  label: string;
  value: string;
  hint?: string;
  tone?: "blue" | "purple" | "green" | "orange";
}) {
  const tones = {
    blue: "bg-[var(--pastel-blue)]",
    purple: "bg-[var(--pastel-purple)]",
    green: "bg-[rgb(161_227_203/0.28)]",
    orange: "bg-[rgb(255_203_102/0.28)]",
  };
  return (
    <Link href={href} className="block min-w-0">
      <article className="wl-enter rounded-[18px] border border-[var(--border)] bg-[var(--card-bg)] px-4 py-4 transition-colors duration-150 hover:bg-[var(--surface-hover)]">
        <span className={cn("mb-3 flex size-8 items-center justify-center rounded-full text-[var(--static-black)]", tones[tone ?? "blue"])}>
          <Icon name={icon} size={15} />
        </span>
        <p className="text-[12px] leading-[18px] text-[var(--text-muted)]">{label}</p>
        <p className="mt-0.5 text-[24px] font-semibold leading-8 tracking-tight">{value}</p>
        {hint ? <p className="mt-1 text-[12px] text-[var(--text-muted)]">{hint}</p> : null}
      </article>
    </Link>
  );
}

function formatTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function HabitDashboardOverview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<DashboardStats | null>(null);
  const dataRef = useRef<DashboardStats | null>(null);
  dataRef.current = data;

  const load = useCallback(async () => {
    const hasData = dataRef.current != null;
    if (!hasData) setLoading(true);
    try {
      const next = await apiGet<DashboardStats>("/api/admin/dashboard");
      setData(next);
      setError(next.stale ? "Mongo was busy. Showing the last good snapshot." : "");
    } catch (err) {
      if (!hasData) {
        setError(err instanceof ApiError ? err.message : "Unable to load dashboard.");
      } else {
        setError("Live refresh failed. Showing the last loaded numbers.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useDeferredEffect(() => {
    void load();
  }, [load]);

  const chart = data?.weekChart ?? [];
  const status = (data?.statusBreakdown ?? []).filter((item) => item.value > 0);
  const modes = (data?.reminderModes ?? []).filter((item) => item.value > 0);
  const coverage = data && data.users > 0
    ? Math.round(((data.usersWithDevices ?? 0) / data.users) * 100)
    : 0;

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-5 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">Overview</p>
          <h1 className="text-[22px] font-semibold leading-8 tracking-tight">Reminder analytics</h1>
          <p className="mt-1 text-[13px] leading-5 text-[var(--text-muted)]">
            Live delivery, device coverage, and habit schedule health.
          </p>
        </div>
        <SecondaryButton type="button" disabled={loading} onClick={() => void load()}>
          <Icon name="history" size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </SecondaryButton>
      </div>

      {error ? <p className="text-[13px] text-[var(--bright-red)]">{error}</p> : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          href={adminPath("/notifications/fcm-overview")}
          icon="person"
          label="App users"
          value={loading ? "…" : String(data?.users ?? 0)}
          hint={loading ? undefined : `${data?.usersWithDevices ?? 0} with a device`}
        />
        <StatTile
          href={adminPath("/notifications/fcm-overview")}
          icon="bell"
          label="Active reminders"
          value={loading ? "…" : String(data?.reminders ?? 0)}
          hint={loading ? undefined : `${data?.timerReminders ?? 0} fixed · ${data?.repeatReminders ?? 0} repeat`}
          tone="purple"
        />
        <StatTile
          href={adminPath("/notifications/fcm-overview")}
          icon="broadcast"
          label="Registered devices"
          value={loading ? "…" : String(data?.registeredDevices ?? 0)}
          hint={loading ? undefined : `${coverage}% user coverage`}
          tone="green"
        />
        <StatTile
          href={adminPath("/notifications/fcm-overview")}
          icon="history"
          label="Deliveries today"
          value={loading ? "…" : String(data?.deliveriesToday ?? 0)}
          hint={loading ? undefined : `${data?.deliveryRatePercent ?? 100}% delivered`}
          tone="orange"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <section className="rounded-[18px] border border-[var(--border)] bg-[var(--card-bg)] p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-[14px] font-semibold">Delivery performance</h2>
              <p className="text-[12px] text-[var(--text-muted)]">Last 7 days</p>
            </div>
            <span className="text-[12px] text-[var(--text-muted)]">
              {(data?.weekDelta ?? 0) >= 0 ? "+" : ""}
              {data?.weekDelta ?? 0}% vs prior week
            </span>
          </div>
          <div className="h-[240px] w-full">
            {loading ? (
              <div className="h-full animate-pulse rounded-[12px] bg-[var(--black-05)]" />
            ) : (
              <FcmDeliveryChart data={chart} />
            )}
          </div>
        </section>

        <section className="rounded-[18px] border border-[var(--border)] bg-[var(--card-bg)] p-5">
          <h2 className="mb-3 text-[14px] font-semibold">Outcome mix</h2>
          {loading ? (
            <div className="h-[220px] animate-pulse rounded-[12px] bg-[var(--black-05)]" />
          ) : status.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-[var(--text-muted)]">
              No deliveries yet. Sends appear after cron or a test push.
            </p>
          ) : (
            <DistributionDonut data={status} totalLabel="Sends" />
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-[18px] border border-[var(--border)] bg-[var(--card-bg)] p-5">
          <h2 className="mb-3 text-[14px] font-semibold">Schedule mix</h2>
          {loading ? (
            <div className="h-[180px] animate-pulse rounded-[12px] bg-[var(--black-05)]" />
          ) : modes.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-[var(--text-muted)]">No habit schedules stored yet.</p>
          ) : (
            <DistributionDonut data={modes} totalLabel="Reminders" />
          )}
        </section>

        <section className="rounded-[18px] border border-[var(--border)] bg-[var(--card-bg)] p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[14px] font-semibold">Recent activity</h2>
            <Link href={adminPath("/notifications/fcm-overview")} className="text-[12px] text-[var(--bright-purple)] hover:underline">
              Open FCM
            </Link>
          </div>
          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-10 animate-pulse rounded-[10px] bg-[var(--black-05)]" />
              ))}
            </div>
          ) : !data?.recentDeliveries?.length ? (
            <p className="py-8 text-center text-[13px] text-[var(--text-muted)]">Nothing sent yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {data.recentDeliveries.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 rounded-[12px] bg-[var(--black-05)] px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">{item.habitName}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">{formatTime(item.createdAt)}</p>
                  </div>
                  <span className="shrink-0 text-[11px] capitalize text-[var(--text-secondary)]">{item.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
