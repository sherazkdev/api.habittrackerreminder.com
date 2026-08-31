"use client";

import { DistributionDonut } from "@/components/dashboard/recharts-charts";
import type { DeviceAnalytics, DeviceStats } from "@/lib/devices-api";
import { cn } from "@/lib/cn";

function PanelCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[14px] border border-[var(--border)] bg-[var(--card-bg)] p-4",
        className,
      )}
    >
      <h2 className="mb-3 text-[13px] font-semibold leading-5">{title}</h2>
      {children}
    </section>
  );
}

export function DevicesAnalyticsPanel({
  stats,
  analytics,
}: {
  stats: DeviceStats;
  analytics: DeviceAnalytics;
}) {
  const { platformSplit, activity } = analytics;
  const healthData = analytics.healthSplit.filter((item) => item.value > 0);

  return (
    <div className="flex flex-col gap-3">
      <PanelCard title="Token Health">
        {healthData.length === 0 ? (
          <p className="text-[13px] text-[var(--text-muted)]">No devices registered yet.</p>
        ) : (
          <>
            <DistributionDonut data={healthData} totalLabel="Total" />
            <p className="mt-2 text-center text-[12px] text-[var(--text-muted)]">
              {stats.activePercent}% active (last 7 days)
            </p>
          </>
        )}
      </PanelCard>

      <PanelCard title="Platform Split">
        <div className="flex flex-col gap-3">
          <PlatformBar label="Android" percent={platformSplit.androidPercent} tone="purple" />
          <PlatformBar label="iOS" percent={platformSplit.iosPercent} tone="blue" />
          {platformSplit.unknown > 0 ? (
            <PlatformBar label="Unknown" percent={platformSplit.unknownPercent} tone="muted" />
          ) : null}
        </div>
      </PanelCard>

      <PanelCard title="Token Activity">
        <ul className="flex flex-col gap-2 text-[13px] leading-5">
          <li className="flex items-center justify-between rounded-[10px] bg-[var(--black-05)] px-3 py-2">
            <span className="text-[var(--text-secondary)]">Registered today</span>
            <span className="font-semibold">{activity.registeredToday}</span>
          </li>
          <li className="flex items-center justify-between rounded-[10px] bg-[var(--black-05)] px-3 py-2">
            <span className="text-[var(--text-secondary)]">Refreshed today</span>
            <span className="font-semibold">{activity.refreshedToday}</span>
          </li>
        </ul>
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
          <span aria-hidden>🔒</span>
          Tokens are masked for security
        </p>
      </PanelCard>
    </div>
  );
}

function PlatformBar({
  label,
  percent,
  tone,
}: {
  label: string;
  percent: number;
  tone: "purple" | "blue" | "muted";
}) {
  const color =
    tone === "purple" ? "var(--bright-purple)" : tone === "blue" ? "var(--chart-blue)" : "var(--text-muted)";
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[12px] leading-[18px]">
        <span className="text-[var(--text-secondary)]">{label}</span>
        <span className="font-medium">{percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--black-05)]">
        <div className="h-full rounded-full transition-all" style={{ width: `${percent}%`, background: color }} />
      </div>
    </div>
  );
}
