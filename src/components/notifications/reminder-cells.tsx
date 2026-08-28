"use client";

import { cn } from "@/lib/cn";

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export function ReminderDaysCell({ days }: { days: number[] }) {
  return (
    <div className="flex items-center gap-0.5">
      {DAY_LABELS.map((label, index) => {
        const active = days.includes(index);
        return (
          <span
            key={`${label}-${index}`}
            className={cn(
              "flex size-5 items-center justify-center rounded-full text-[10px] font-medium leading-none",
              active
                ? "bg-[var(--bright-purple)] text-white"
                : "bg-[var(--black-05)] text-[var(--text-disabled)]",
            )}
            title={["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][index]}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}

export function ReminderToggle({
  enabled,
  disabled,
  onChange,
}: {
  enabled: boolean;
  disabled?: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
        enabled ? "bg-[var(--bright-purple)]" : "bg-[var(--black-20)]",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <span
        className={cn(
          "inline-block size-4 rounded-full bg-white shadow transition-transform",
          enabled ? "translate-x-[18px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
