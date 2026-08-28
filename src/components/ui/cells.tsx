"use client";

import { Icon } from "@/components/ui/icon";
import { Thumb } from "@/components/ui/feedback";

export const relativeDates = [
  "Just now",
  "A minute ago",
  "Yesterday",
  "Feb 2, 2023",
  "Feb 2, 2023",
  "Feb 2, 2023",
  "Feb 2, 2023",
  "Feb 2, 2023",
];

export function NameCell({ name, icon }: { name: string; icon?: string | null }) {
  const raster = Boolean(icon && (icon.startsWith("http") || icon.startsWith("/uploads") || !icon.startsWith("/assets/")));
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      {icon ? (
        raster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={icon} alt="" className="size-4 shrink-0 object-contain" />
        ) : (
          <span
            className="inline-block size-4 shrink-0 bg-current"
            style={{
              WebkitMask: `url("${encodeURI(icon)}") center / contain no-repeat`,
              mask: `url("${encodeURI(icon)}") center / contain no-repeat`,
            }}
          />
        )
      ) : (
        <Thumb label={name} />
      )}
      <span className="truncate">{name}</span>
    </span>
  );
}

export function DateCell({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] leading-[18px]">
      <Icon name="calendar" size={14} className="text-[var(--text-muted)]" />
      {label}
    </span>
  );
}

export function IdCell({ value }: { value: string }) {
  return <span className="text-[12px] leading-[18px]">{value}</span>;
}
