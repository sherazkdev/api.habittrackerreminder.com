"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DashboardChartTooltip } from "@/components/dashboard/chart-chrome";
import type { FcmActivityItem, FcmSystemStatus } from "@/lib/fcm-overview-api";
import { cn } from "@/lib/cn";

const axisTick = { fill: "var(--text-muted)", fontSize: 11 };

export function FcmDeliveryChart({
  data,
}: {
  data: Array<{ label: string; delivered: number; failed: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} width={32} tick={axisTick} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ stroke: "var(--border-strong)" }}
          content={({ active, payload, label }) => (
            <DashboardChartTooltip
              active={active}
              label={label}
              rows={
                payload?.map((item) => ({
                  name: item.dataKey === "failed" ? "Failed" : "Delivered",
                  value: String(item.value ?? 0),
                  color: typeof item.color === "string" ? item.color : undefined,
                })) ?? []
              }
            />
          )}
        />
        <Area
          type="monotone"
          dataKey="delivered"
          stroke="var(--bright-purple)"
          fill="var(--bright-purple)"
          fillOpacity={0.12}
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="failed"
          stroke="var(--bright-red)"
          fill="var(--bright-red)"
          fillOpacity={0.08}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function FlowNode({
  label,
  status,
}: {
  label: string;
  status: "connected" | "degraded" | "offline";
}) {
  const tone =
    status === "connected"
      ? "var(--status-active)"
      : status === "degraded"
        ? "var(--bright-orange)"
        : "var(--bright-red)";
  const statusLabel =
    status === "connected" ? "Connected" : status === "degraded" ? "Degraded" : "Offline";

  return (
    <div className="flex min-w-[120px] flex-1 flex-col items-center gap-2 rounded-[12px] border border-[var(--border)] bg-[var(--black-05)] px-3 py-3 text-center">
      <span className="inline-flex size-2 rounded-full" style={{ background: tone }} />
      <p className="text-[13px] font-medium leading-5">{label}</p>
      <p className="text-[11px] leading-4 text-[var(--text-muted)]">{statusLabel}</p>
    </div>
  );
}

export function FcmDeliveryFlow({
  flow,
}: {
  flow: {
    mobileApp: "connected" | "degraded" | "offline";
    apiServer: "connected" | "degraded" | "offline";
    firebaseFcm: "connected" | "degraded" | "offline";
    userDevice: "connected" | "degraded" | "offline";
  };
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
      <FlowNode label="Mobile App" status={flow.mobileApp} />
      <div className="hidden items-center text-[var(--text-muted)] lg:flex">→</div>
      <FlowNode label="API Server" status={flow.apiServer} />
      <div className="hidden items-center text-[var(--text-muted)] lg:flex">→</div>
      <FlowNode label="Firebase FCM" status={flow.firebaseFcm} />
      <div className="hidden items-center text-[var(--text-muted)] lg:flex">→</div>
      <FlowNode label="User Device" status={flow.userDevice} />
    </div>
  );
}

function StatusRow({
  label,
  status,
}: {
  label: string;
  status: FcmSystemStatus[keyof Pick<FcmSystemStatus, "firebaseAdmin" | "scheduler" | "api">];
}) {
  const labelText =
    status === "connected" ? "Connected" : status === "degraded" ? "Degraded" : "Offline";
  const tone =
    status === "connected"
      ? "text-[var(--status-active)]"
      : status === "degraded"
        ? "text-[var(--bright-orange)]"
        : "text-[var(--bright-red)]";

  return (
    <li className="flex items-center justify-between gap-3 text-[13px] leading-5">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className={cn("font-medium", tone)}>{labelText}</span>
    </li>
  );
}

export function FcmOverviewSidebar({
  activity,
  system,
}: {
  activity: FcmActivityItem[];
  system: FcmSystemStatus;
}) {
  return (
    <div className="flex flex-col gap-3">
      <section className="rounded-[14px] border border-[var(--border)] bg-[var(--card-bg)] p-4">
        <h2 className="mb-3 text-[13px] font-semibold leading-5">FCM Activity</h2>
        {activity.length === 0 ? (
          <p className="text-[13px] text-[var(--text-muted)]">No recent activity yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {activity.map((item) => (
              <li
                key={item.id}
                className="rounded-[10px] bg-[var(--black-05)] px-3 py-2 text-[12px] leading-[18px]"
              >
                <span
                  className={cn(
                    "font-medium",
                    item.tone === "success"
                      ? "text-[var(--status-active)]"
                      : item.tone === "warning"
                        ? "text-[var(--bright-orange)]"
                        : "text-[var(--text-secondary)]",
                  )}
                >
                  {item.message}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-[14px] border border-[var(--border)] bg-[var(--card-bg)] p-4">
        <h2 className="mb-3 text-[13px] font-semibold leading-5">System Status</h2>
        <ul className="flex flex-col gap-2">
          <StatusRow label="Firebase Admin" status={system.firebaseAdmin} />
          <StatusRow label="Scheduler" status={system.scheduler} />
          <StatusRow label="API" status={system.api} />
        </ul>
        {!system.firebaseConfigured ? (
          <p className="mt-3 text-[11px] leading-4 text-[var(--bright-orange)]">
            Add Firebase credentials in `.env` to enable push delivery.
          </p>
        ) : null}
      </section>
    </div>
  );
}

function DeliveryStatusBadge({
  status,
}: {
  status: "delivered" | "partial" | "failed" | "skipped";
}) {
  const styles = {
    delivered: "bg-[var(--status-active-bg)] text-[var(--status-active)]",
    partial: "bg-[var(--pastel-blue)] text-[var(--bright-blue)]",
    failed: "bg-[var(--status-error-bg)] text-[var(--bright-red)]",
    skipped: "bg-[var(--black-05)] text-[var(--text-muted)]",
  } as const;

  const labels = {
    delivered: "Delivered",
    partial: "Partial",
    failed: "Failed",
    skipped: "Skipped",
  } as const;

  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium", styles[status])}>
      {labels[status]}
    </span>
  );
}

export function FcmRecentDeliveriesTable({
  rows,
  shortUid,
  formatTime,
}: {
  rows: Array<{
    id: number;
    createdAt: string;
    firebaseUid: string;
    notification: string;
    tokenCount: number;
    status: "delivered" | "partial" | "failed" | "skipped";
  }>;
  shortUid: (uid: string) => string;
  formatTime: (value: string) => string;
}) {
  if (rows.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-[13px] text-[var(--text-muted)]">
        No deliveries logged yet. Sends appear here after the worker cron runs.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[720px] w-full text-left text-[13px] leading-5">
        <thead>
          <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
            <th className="px-4 py-3 font-medium">Time</th>
            <th className="px-4 py-3 font-medium">User</th>
            <th className="px-4 py-3 font-medium">Notification</th>
            <th className="hidden px-4 py-3 font-medium md:table-cell">Tokens</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-[var(--border)] last:border-b-0">
              <td className="px-4 py-3 whitespace-nowrap text-[var(--text-secondary)]">
                {formatTime(row.createdAt)}
              </td>
              <td className="px-4 py-3">
                <code className="text-[12px]">{shortUid(row.firebaseUid)}</code>
              </td>
              <td className="px-4 py-3">{row.notification}</td>
              <td className="hidden px-4 py-3 md:table-cell">{row.tokenCount}</td>
              <td className="px-4 py-3">
                <DeliveryStatusBadge status={row.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
