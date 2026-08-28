"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icon";

export type SelectOption = { value: string; label: string };

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  error,
}: {
  options: SelectOption[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => options.filter((option) => value.includes(option.value)),
    [options, value],
  );

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="relative" ref={rootRef}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen((v) => !v);
          }
        }}
        className={cn(
          "flex min-h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-[8px] border bg-[var(--input-bg)] px-3 py-1.5 text-left text-[14px] leading-5 transition-colors",
          error ? "border-[var(--bright-red)]" : "border-[var(--input-border)]",
          open && "border-[var(--border-strong)] ring-2 ring-[var(--focus-ring)]",
        )}
      >
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {selected.length === 0 ? (
            <span className="text-[var(--text-muted)]">{placeholder}</span>
          ) : (
            selected.map((option) => (
              <span
                key={option.value}
                className="inline-flex max-w-full items-center gap-1 rounded-full bg-[var(--pastel-purple)] px-2 py-0.5 text-[12px] leading-[18px] text-[var(--static-black)]"
              >
                <span className="truncate">{option.label}</span>
                <button
                  type="button"
                  className="rounded-full hover:opacity-70"
                  aria-label={`Remove ${option.label}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onChange(value.filter((item) => item !== option.value));
                  }}
                >
                  <Icon name="x" size={10} />
                </button>
              </span>
            ))
          )}
        </span>
        <Icon name="caretDown" size={12} className="shrink-0 text-[var(--text-muted)]" />
      </div>
      {open ? (
        <div className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-[12px] border border-[var(--border)] bg-[var(--surface)] py-1 shadow-[var(--shadow-xs)]">
          {options.length === 0 ? (
            <p className="px-3 py-2 text-[13px] text-[var(--text-muted)]">No options available</p>
          ) : (
            options.map((option) => {
              const isSelected = value.includes(option.value);
              return (
                <button
                  type="button"
                  key={option.value}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-[14px] leading-5 hover:bg-[var(--surface-hover)]",
                    isSelected && "bg-[var(--nav-hover-bg)]",
                  )}
                  onClick={() => {
                    onChange(
                      isSelected
                        ? value.filter((item) => item !== option.value)
                        : [...value, option.value],
                    );
                  }}
                >
                  <span
                    className={cn(
                      "flex size-4 items-center justify-center rounded-[4px] border",
                      isSelected
                        ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--page-bg)]"
                        : "border-[var(--border-strong)]",
                    )}
                  >
                    {isSelected ? <span className="text-[10px] leading-none">✓</span> : null}
                  </span>
                  {option.label}
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
