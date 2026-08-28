"use client";

import { useSyncExternalStore } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DashboardChartTooltip } from "@/components/dashboard/chart-chrome";
import { pluralize } from "@/lib/dashboard-chart-utils";

function subscribeReducedMotion(onStoreChange: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

const axisTick = { fill: "var(--text-muted)", fontSize: 11 };

export function MealsCreatedChart({
  data,
  showPrevious,
}: {
  data: Array<{ date: string; count: number; previous: number }>;
  showPrevious: boolean;
}) {
  const reduced = usePrefersReducedMotion();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis dataKey="date" tick={axisTick} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} width={28} tick={axisTick} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ stroke: "var(--border-strong)" }}
          content={({ active, payload, label }) => (
            <DashboardChartTooltip
              active={active}
              label={label}
              rows={
                payload?.map((item) => ({
                  name: item.dataKey === "previous" ? "Previous period" : "Meals created",
                  value: String(item.value ?? 0),
                  color: typeof item.color === "string" ? item.color : undefined,
                })) ?? []
              }
            />
          )}
        />
        {showPrevious ? (
          <Area
            type="monotone"
            dataKey="previous"
            stroke="var(--chart-prev)"
            fill="transparent"
            strokeDasharray="4 5"
            strokeWidth={2}
            isAnimationActive={!reduced}
          />
        ) : null}
        <Area
          type="monotone"
          dataKey="count"
          stroke="var(--chart-line)"
          fill="var(--chart-fill)"
          strokeWidth={2}
          isAnimationActive={!reduced}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function MealsByCategoryChart({
  data,
}: {
  data: Array<{ category: string; meals: number }>;
}) {
  const reduced = usePrefersReducedMotion();
  const height = Math.max(200, data.length * 36);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart layout="vertical" data={data} margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
        <CartesianGrid stroke="var(--chart-grid)" horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={axisTick} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="category"
          width={88}
          tick={axisTick}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "var(--black-05)" }}
          content={({ active, payload }) => {
            const row = payload?.[0]?.payload as { category?: string; meals?: number } | undefined;
            return (
              <DashboardChartTooltip
                active={active}
                label={row?.category}
                rows={row ? [{ name: "Count", value: pluralize(row.meals ?? 0, "meal") }] : []}
              />
            );
          }}
        />
        <Bar
          dataKey="meals"
          fill="var(--chart-purple)"
          radius={[0, 6, 6, 0]}
          maxBarSize={18}
          isAnimationActive={!reduced}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ExercisesByLevelChart({
  data,
}: {
  data: Array<{ level: string; exercises: number }>;
}) {
  const reduced = usePrefersReducedMotion();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
        <XAxis dataKey="level" tick={axisTick} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} width={28} tick={axisTick} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: "var(--black-05)" }}
          content={({ active, payload, label }) => (
            <DashboardChartTooltip
              active={active}
              label={label}
              rows={
                payload?.length
                  ? [{ name: "Exercises", value: String(payload[0]?.value ?? 0) }]
                  : []
              }
            />
          )}
        />
        <Bar
          dataKey="exercises"
          fill="var(--chart-blue)"
          radius={[6, 6, 0, 0]}
          maxBarSize={36}
          isAnimationActive={!reduced}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DistributionDonut({
  data,
  totalLabel = "Total",
}: {
  data: Array<{ label: string; value: number; color: string }>;
  totalLabel?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const total = data.reduce((sum, item) => sum + item.value, 0);
  return (
    <div className="flex h-full min-h-[180px] flex-col items-center gap-3 sm:flex-row sm:items-center">
      <div className="relative h-[160px] w-full max-w-[180px] shrink-0 sm:h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius="58%"
              outerRadius="82%"
              paddingAngle={data.length > 1 ? 2 : 0}
              isAnimationActive={!reduced}
            >
              {data.map((item) => (
                <Cell key={item.label} fill={item.color} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                const row = payload?.[0]?.payload as { label?: string; value?: number } | undefined;
                const pct = total ? Math.round(((row?.value ?? 0) / total) * 100) : 0;
                return (
                  <DashboardChartTooltip
                    active={active}
                    label={row?.label}
                    rows={row ? [{ name: "Share", value: `${row.value} (${pct}%)` }] : []}
                  />
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex min-w-0 flex-1 flex-col gap-2">
        {data.map((item) => {
          const pct = total ? Math.round((item.value / total) * 100) : 0;
          return (
            <li key={item.label} className="flex items-center gap-2 text-[12px] leading-[18px]">
              <span className="size-1.5 shrink-0 rounded-full" style={{ background: item.color }} />
              <span className="min-w-0 truncate text-[var(--text-muted)]">{item.label}</span>
              <span className="ml-auto shrink-0">
                {item.value}
                <span className="text-[var(--text-muted)]"> ({pct}%)</span>
              </span>
            </li>
          );
        })}
        <li className="pt-1 text-[12px] leading-[18px] text-[var(--text-muted)]">
          {totalLabel} {total}
        </li>
      </ul>
    </div>
  );
}
