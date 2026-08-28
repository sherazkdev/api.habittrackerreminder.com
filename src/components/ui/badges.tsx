import { cn } from "@/lib/cn";
import type { Difficulty, Gender } from "@/lib/types";

export function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] leading-[18px]">
      <span
        className="size-1.5 rounded-full"
        style={{ background: active ? "var(--status-active)" : "var(--status-inactive)" }}
      />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export function ChallengeBadge({ challenge }: { challenge: boolean }) {
  if (!challenge) {
    return <span className="text-[12px] leading-[18px] text-[var(--text-muted)]">—</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] leading-[18px]">
      <span className="size-1.5 rounded-full bg-[var(--bright-orange)]" />
      Challenge
    </span>
  );
}

export function GenderBadge({ gender }: { gender?: Gender | string | null }) {
  const map = {
    male: { label: "Male", color: "var(--bright-blue)" },
    female: { label: "Female", color: "var(--bright-purple)" },
    both: { label: "Both", color: "var(--bright-mint)" },
  } as const;
  const item = map[gender as Gender] ?? map.both;
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] leading-[18px]">
      <span className="size-1.5 rounded-full" style={{ background: item.color }} />
      {item.label}
    </span>
  );
}

export function DifficultyBadge({ difficulty }: { difficulty?: Difficulty | string | null }) {
  const map = {
    easy: { label: "Easy", color: "var(--status-easy)" },
    medium: { label: "Medium", color: "var(--status-medium)" },
    hard: { label: "Hard", color: "var(--status-hard)" },
    beginner: { label: "Beginner", color: "var(--status-easy)" },
    intermediate: { label: "Intermediate", color: "var(--status-medium)" },
    advanced: { label: "Advanced", color: "var(--status-hard)" },
  } as const;
  const key = String(difficulty ?? "medium").toLowerCase() as keyof typeof map;
  const item = map[key] ?? map.medium;
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] leading-[18px] capitalize">
      <span className="size-1.5 rounded-full" style={{ background: item.color }} />
      {item.label}
    </span>
  );
}

export function Pill({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full bg-[var(--black-05)] px-2 text-[12px] leading-[18px]",
        className,
      )}
    >
      {children}
    </span>
  );
}
