"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Thumb } from "@/components/ui/feedback";
import { fetchDashboardAnalytics, relativeTime } from "@/lib/dashboard-api";
import { fetchJobs, type DataJobApi } from "@/lib/jobs-api";
import { adminPath } from "@/lib/admin-path";

function Chip({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span
      className="flex size-6 shrink-0 items-center justify-center rounded-full text-[var(--static-black)]"
      style={{ background: color }}
    >
      {children}
    </span>
  );
}

function EmptyPanelState({ label }: { label: string }) {
  return <p className="text-[12px] leading-[18px] text-[var(--text-muted)]">{label}</p>;
}

function jobNotification(job: DataJobApi) {
  const resource = job.resource.replace(/-/g, " ");
  if (job.status === "completed") {
    return {
      id: String(job.id),
      title: `${job.type.toUpperCase()} finished — ${resource}`,
      time: relativeTime(job.completedAt ?? job.createdAt),
      icon: "upload" as const,
      chip: "var(--pastel-blue)",
      href: adminPath("/data/jobs"),
    };
  }
  if (job.status === "failed") {
    return {
      id: String(job.id),
      title: `${job.type.toUpperCase()} failed — ${resource}`,
      time: relativeTime(job.completedAt ?? job.createdAt),
      icon: "warning" as const,
      chip: "var(--bright-red)",
      href: adminPath("/data/jobs"),
    };
  }
  return {
    id: String(job.id),
    title: `${job.type.toUpperCase()} in progress — ${resource}`,
    time: relativeTime(job.startedAt ?? job.createdAt),
    icon: "history" as const,
    chip: "var(--pastel-purple)",
    href: adminPath("/data/jobs"),
  };
}

export function RightPanel() {
  const [recentDeliveries, setRecentDeliveries] = useState<
    Array<{ id: string; habitName: string; createdAt: string; status: string }>
  >([]);
  const [jobAlerts, setJobAlerts] = useState<ReturnType<typeof jobNotification>[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const data = await fetchDashboardAnalytics();
        setRecentDeliveries(data.recentDeliveries);
      } catch {
        setRecentDeliveries([]);
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const jobs = await fetchJobs();
        setJobAlerts(
          jobs
            .slice(0, 6)
            .map(jobNotification),
        );
      } catch {
        setJobAlerts([]);
      }
    })();
  }, []);

  const activities = useMemo(() => {
    return recentDeliveries.slice(0, 8).map((item) => ({
      id: item.id,
      title: item.habitName,
      label: item.habitName.slice(0, 1).toUpperCase() || "H",
      tone: "blue" as const,
      href: adminPath("/notifications/fcm-overview"),
      time: relativeTime(item.createdAt),
    }));
  }, [recentDeliveries]);

  return (
    <aside className="relative hidden h-full w-[var(--right-panel-width)] shrink-0 border-l border-[var(--border)] bg-[var(--sidebar-bg)] xl:block">
      <div className="absolute inset-0 overflow-y-auto scrollbar-thin">
      <section className="px-5 py-5">
        <h2 className="mb-4 text-[14px] font-semibold leading-5">Job Activity</h2>
        <ul className="flex flex-col gap-4">
          {jobAlerts.length > 0 ? (
            jobAlerts.map((item) => (
              <li key={item.id} className="flex items-start gap-2">
                <Chip color={item.chip}>
                  <Icon name={item.icon} size={14} />
                </Chip>
                <div className="min-w-0">
                  <Link href={item.href} className="truncate text-[14px] leading-5 hover:underline">
                    {item.title}
                  </Link>
                  <p className="text-[12px] leading-[18px] text-[var(--text-muted)]">{item.time}</p>
                </div>
              </li>
            ))
          ) : (
            <EmptyPanelState label="No recent import/export jobs" />
          )}
        </ul>
      </section>

      <section className="px-5 py-5">
        <h2 className="mb-4 text-[14px] font-semibold leading-5">Recent deliveries</h2>
        <ul className="flex flex-col">
          {activities.length > 0 ? (
            activities.map((item, index) => (
              <li key={item.id} className="relative flex items-start gap-2 pb-4 last:pb-0">
                {index < activities.length - 1 ? (
                  <span className="absolute left-3 top-6 h-[calc(100%-12px)] w-px bg-[var(--border)]" />
                ) : null}
                <Thumb label={item.label} tone={item.tone} />
                <div className="min-w-0">
                  <Link href={item.href} className="truncate text-[14px] leading-5 hover:underline">
                    {item.title}
                  </Link>
                  <p className="text-[12px] leading-[18px] text-[var(--text-muted)]">{item.time}</p>
                </div>
              </li>
            ))
          ) : (
            <EmptyPanelState label="No recent deliveries" />
          )}
        </ul>
      </section>
      </div>
    </aside>
  );
}
