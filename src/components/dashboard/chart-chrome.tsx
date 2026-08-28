"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function DashboardChartTooltip({
  active,
  label,
  rows,
}: {
  active?: boolean;
  label?: string | number;
  rows?: Array<{ name: string; value: string; color?: string }>;
}) {
  if (!active || !rows?.length) return null;
  return (
    <div className="rounded-[10px] border border-[var(--border)] bg-[var(--modal-bg)] px-3 py-2 shadow-[var(--shadow-xs)]">
      {label ? <p className="text-[12px] leading-[18px] text-[var(--text-muted)]">{label}</p> : null}
      <ul className="mt-1 flex flex-col gap-0.5">
        {rows.map((row) => (
          <li key={row.name} className="flex items-center gap-2 text-[12px] leading-[18px]">
            {row.color ? (
              <span className="size-1.5 rounded-full" style={{ background: row.color }} />
            ) : null}
            <span>
              {row.name}: {row.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DashboardChartEmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2 px-4 py-6 text-center">
      {icon ? (
        <span className="flex size-10 items-center justify-center rounded-full bg-[var(--pastel-blue)] text-[var(--static-black)]">
          {icon}
        </span>
      ) : null}
      <p className="text-[14px] font-semibold leading-5">{title}</p>
      <p className="max-w-xs text-[12px] leading-[18px] text-[var(--text-muted)]">{description}</p>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

export function DashboardChartSkeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-[16px] bg-[var(--black-05)]", className)} />;
}
