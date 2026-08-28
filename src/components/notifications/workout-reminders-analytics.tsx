"use client";

import { DistributionDonut } from "@/components/dashboard/recharts-charts";
import type { WorkoutReminderAnalytics, WorkoutReminderStats } from "@/lib/workout-reminders-api";
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

export function WorkoutRemindersAnalyticsPanel({
  stats,
  analytics,
}: {
  stats: WorkoutReminderStats;
  analytics: WorkoutReminderAnalytics;
}) {
  const { genderSplit, upcomingToday } = analytics;

  return (
    <div className="flex flex-col gap-3">
      <PanelCard title="Reminder Summary">
        <DistributionDonut
          data={analytics.statusSplit.filter((item) => item.value > 0)}
          totalLabel="Total"
        />
        <p className="mt-2 text-center text-[12px] text-[var(--text-muted)]">
          {stats.enabledPercent}% enabled
        </p>
      </PanelCard>

      <PanelCard title="Gender Split">
        <div className="flex flex-col gap-3">
          <GenderBar label="Male" percent={genderSplit.malePercent} tone="blue" />
          <GenderBar label="Female" percent={genderSplit.femalePercent} tone="pink" />
        </div>
      </PanelCard>

      <PanelCard title="Upcoming Today">
        {upcomingToday.length === 0 ? (
          <p className="text-[13px] leading-5 text-[var(--text-muted)]">No reminders scheduled for today.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {upcomingToday.map((item) => (
              <li
                key={`${item.time}-${item.timezone}`}
                className="flex items-start justify-between gap-2 rounded-[10px] bg-[var(--black-05)] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-medium leading-5">{item.time}</p>
                  <p className="truncate text-[12px] leading-[18px] text-[var(--text-muted)]">
                    {item.timezone}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-[rgb(149_164_252/0.18)] px-2 py-0.5 text-[11px] font-medium text-[var(--bright-purple)]">
                  {item.count}
                </span>
              </li>
            ))}
          </ul>
        )}
      </PanelCard>
    </div>
  );
}

function GenderBar({
  label,
  percent,
  tone,
}: {
  label: string;
  percent: number;
  tone: "blue" | "pink";
}) {
  const color = tone === "blue" ? "var(--chart-blue)" : "var(--bright-pink, #f472b6)";
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
