"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DistributionDonut } from "@/components/dashboard/recharts-charts";
import { DashboardChartTooltip } from "@/components/dashboard/chart-chrome";
import type { DeliveryLogAnalytics, DeliveryLogStats } from "@/lib/delivery-logs-api";
import { cn } from "@/lib/cn";

const axisTick = { fill: "var(--text-muted)", fontSize: 11 };

function PanelCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[14px] border border-[var(--border)] bg-[var(--card-bg)] p-4">
      <h2 className="mb-3 text-[13px] font-semibold leading-5">{title}</h2>
      {children}
    </section>
  );
}

export function DeliveryLogsAnalyticsPanel({
  stats,
  analytics,
}: {
  stats: DeliveryLogStats;
  analytics: DeliveryLogAnalytics;
}) {
  const deliveryData = analytics.deliveryRate.filter((item) => item.value > 0);

  return (
    <div className="flex flex-col gap-3">
      <PanelCard title="Delivery Rate">
        {deliveryData.length === 0 ? (
          <p className="text-[13px] text-[var(--text-muted)]">No delivery attempts yet.</p>
        ) : (
          <>
            <DistributionDonut data={deliveryData} totalLabel="Attempts" />
            <p className="mt-2 text-center text-[12px] text-[var(--text-muted)]">
              {stats.successRatePercent}% success rate
            </p>
          </>
        )}
      </PanelCard>

      <PanelCard title="Failure Reasons">
        {analytics.failureReasons.length === 0 ? (
          <p className="text-[13px] text-[var(--text-muted)]">No failures recorded.</p>
        ) : (
          <div className="h-[160px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analytics.failureReasons}
                layout="vertical"
                margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid stroke="var(--chart-grid)" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="reason"
                  width={92}
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "var(--black-05)" }}
                  content={({ active, payload, label }) => (
                    <DashboardChartTooltip
                      active={active}
                      label={label}
                      rows={
                        payload?.length
                          ? [{ name: "Count", value: String(payload[0]?.value ?? 0) }]
                          : []
                      }
                    />
                  )}
                />
                <Bar dataKey="count" fill="var(--bright-red)" radius={[0, 6, 6, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </PanelCard>

      <PanelCard title="Delivery Mode">
        <ul className="flex flex-col gap-2 text-[13px] leading-5">
          <li className="flex items-center justify-between rounded-[10px] bg-[var(--black-05)] px-3 py-2">
            <span className="text-[var(--text-secondary)]">Mode</span>
            <span className="font-medium capitalize">{analytics.queue.mode}</span>
          </li>
          <li className="flex items-center justify-between rounded-[10px] bg-[var(--black-05)] px-3 py-2">
            <span className="text-[var(--text-secondary)]">Skipped (24h)</span>
            <span className="font-medium">{analytics.queue.skippedRecent}</span>
          </li>
          <li className="flex items-center justify-between rounded-[10px] bg-[var(--black-05)] px-3 py-2">
            <span className="text-[var(--text-secondary)]">Scheduler</span>
            <span
              className={cn(
                "font-medium",
                analytics.queue.schedulerEnabled
                  ? "text-[var(--status-active)]"
                  : "text-[var(--bright-orange)]",
              )}
            >
              {analytics.queue.schedulerEnabled ? "Running" : "Disabled"}
            </span>
          </li>
        </ul>
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
          Direct cron delivery — no BullMQ queue for reminders
        </p>
      </PanelCard>
    </div>
  );
}
