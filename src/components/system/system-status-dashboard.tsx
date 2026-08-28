"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { SecondaryButton } from "@/components/ui/buttons";
import { ApiError } from "@/lib/api-client";
import { adminPath } from "@/lib/admin-path";
import { useDeferredEffect } from "@/lib/use-deferred-effect";
import type { IconName } from "@/lib/icons";
import { cn } from "@/lib/cn";
import { fetchSystemStatus, type SystemStatusApi } from "@/lib/system-api";
import { useCallback, useState, type ReactNode } from "react";

function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatCheckedAt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-[10px] bg-[var(--black-05)]", className)} />;
}

function StatusDot({ tone }: { tone: "healthy" | "failed" | "warning" | "info" }) {
  const color =
    tone === "healthy"
      ? "var(--status-active)"
      : tone === "failed"
        ? "var(--bright-red)"
        : tone === "warning"
          ? "var(--bright-orange)"
          : "var(--bright-blue)";
  return <span className="inline-flex size-2 shrink-0 rounded-full" style={{ background: color }} />;
}

function StatusCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: IconName;
  label: string;
  value: string;
  hint: string;
  tone: "healthy" | "failed" | "warning" | "info";
}) {
  return (
    <article className="rounded-[14px] border border-[var(--border)] bg-[var(--card-bg)] px-3 py-3 md:px-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="flex size-7 items-center justify-center rounded-full bg-[var(--pastel-blue)] text-[var(--static-black)]">
          <Icon name={icon} size={14} />
        </span>
        <StatusDot tone={tone} />
      </div>
      <p className="text-[12px] leading-[18px] text-[var(--text-muted)]">{label}</p>
      <p className="mt-0.5 text-[18px] font-semibold leading-7 tracking-tight">{value}</p>
      <p className="mt-0.5 text-[12px] leading-[18px] text-[var(--text-muted)]">{hint}</p>
    </article>
  );
}

function Card({ title, icon, children }: { title: string; icon: IconName; children: ReactNode }) {
  return (
    <section className="rounded-[16px] border border-[var(--border)] bg-[var(--card-bg)] p-4 md:p-5">
      <div className="mb-4 flex min-w-0 items-center gap-2">
        <Icon name={icon} size={16} />
        <h2 className="text-[14px] font-semibold leading-5">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function SystemStatusDashboard() {
  const [data, setData] = useState<SystemStatusApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      setData(await fetchSystemStatus());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load system status.");
      if (!silent) setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useDeferredEffect(() => {
    void load();
  }, [load]);

  const overallTone = data?.status === "healthy" ? "healthy" : "warning";

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-4 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[18px] font-semibold leading-7 tracking-tight">System Status</h1>
          <p className="mt-1 text-[13px] leading-5 text-[var(--text-muted)]">
            API health, MongoDB, Firebase FCM, and reminder cron status.
          </p>
        </div>
        <SecondaryButton type="button" className="w-full sm:w-auto" disabled={loading || refreshing} onClick={() => void load(true)}>
          <Icon name="history" size={14} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </SecondaryButton>
      </div>

      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-[rgb(255_71_71/0.25)] bg-[rgb(255_71_71/0.08)] px-4 py-3 text-[13px] text-[var(--bright-red)]">
          <span className="inline-flex items-start gap-2">
            <Icon name="warning" size={16} className="mt-0.5 shrink-0" />
            {error}
          </span>
          <SecondaryButton type="button" onClick={() => void load()}>
            Try again
          </SecondaryButton>
        </div>
      ) : null}

      {loading && !data ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-[118px]" />
          ))}
        </div>
      ) : null}

      {data ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatusCard
              icon="heartbeat"
              label="Overall status"
              value={data.status === "healthy" ? "Healthy" : "Degraded"}
              hint={`Last checked ${formatCheckedAt(data.checkedAt)}`}
              tone={overallTone}
            />
            <StatusCard
              icon="snowflake"
              label="MongoDB"
              value={data.dependencies.mongo.ok ? "Connected" : "Disconnected"}
              hint={
                data.dependencies.mongo.ok
                  ? `${data.dependencies.mongo.latencyMs} ms`
                  : data.dependencies.mongo.error || "Unable to reach MongoDB"
              }
              tone={data.dependencies.mongo.ok ? "healthy" : "failed"}
            />
            <StatusCard
              icon="broadcast"
              label="Firebase FCM"
              value={data.dependencies.firebase.ok ? "Configured" : "Missing"}
              hint={
                data.dependencies.firebase.ok
                  ? "Admin SDK ready"
                  : data.dependencies.firebase.error || "Add Firebase credentials"
              }
              tone={data.dependencies.firebase.ok ? "healthy" : "failed"}
            />
            <StatusCard
              icon="clock"
              label="API uptime"
              value={formatUptime(data.api.uptimeSeconds)}
              hint={`${data.api.name} v${data.api.version} (${data.api.nodeEnv})`}
              tone="info"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Card title="Reminder pipeline" icon="bell">
              <dl className="grid grid-cols-1 gap-3">
                <div>
                  <dt className="text-[12px] text-[var(--text-muted)]">Cron scheduler</dt>
                  <dd className="mt-0.5 inline-flex items-center gap-2 text-[13px] leading-5">
                    <StatusDot tone={data.reminders.cronEnabled ? "healthy" : "warning"} />
                    {data.reminders.cronEnabled ? "Enabled (CRON_SECRET set)" : "Disabled — set CRON_SECRET"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[12px] text-[var(--text-muted)]">Push notifications</dt>
                  <dd className="mt-0.5 inline-flex items-center gap-2 text-[13px] leading-5">
                    <StatusDot tone={data.features.fcmEnabled ? "healthy" : "warning"} />
                    {data.features.fcmEnabled ? "FCM enabled" : "FCM disabled"}
                  </dd>
                </div>
              </dl>
            </Card>

            <Card title="Quick links" icon="dashboard">
              <div className="flex flex-col gap-2">
                <Link href={adminPath("/notifications/fcm-overview")} className="text-[13px] text-[var(--bright-purple)] hover:underline">
                  Open FCM Overview
                </Link>
                <Link href={adminPath("/settings/api-keys")} className="text-[13px] text-[var(--bright-purple)] hover:underline">
                  Manage API keys
                </Link>
                <Link href="/docs" className="text-[13px] text-[var(--bright-purple)] hover:underline">
                  Open Swagger
                </Link>
                <Link href={adminPath("/settings/change-password")} className="text-[13px] text-[var(--bright-purple)] hover:underline">
                  Change admin password
                </Link>
              </div>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
