"use client";

import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { DangerButton, SecondaryButton } from "@/components/ui/buttons";
import { Icon } from "@/components/ui/icon";

export function ConfirmDeleteModal({
  open,
  resource,
  name,
  deleting = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  resource: string;
  name?: string;
  deleting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !deleting) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, deleting, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[var(--modal-overlay)]"
        onClick={deleting ? undefined : onCancel}
        aria-label="Close"
      />
      <div className="relative w-full max-w-[360px] rounded-[16px] bg-[var(--modal-bg)] p-6 shadow-[var(--shadow-xs)]">
        <div className="mb-4 flex size-8 items-center justify-center rounded-full bg-[rgb(255_71_71/0.12)] text-[var(--bright-red)]">
          <Icon name="warning" size={16} />
        </div>
        <h2 className="text-[14px] font-semibold leading-5">Delete {resource}?</h2>
        <p className="mt-1.5 text-[14px] leading-5 text-[var(--text-muted)]">
          {name ? (
            <>
              <span className="text-ink">{name}</span> will be removed. This action cannot be undone.
            </>
          ) : (
            "This action cannot be undone."
          )}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <SecondaryButton onClick={onCancel} disabled={deleting}>
            Cancel
          </SecondaryButton>
          <DangerButton onClick={onConfirm} loading={deleting}>
            Delete
          </DangerButton>
        </div>
      </div>
    </div>
  );
}

export function FormSection({
  title,
  description,
  step,
  icon,
  variant = "default",
  children,
}: {
  title: string;
  description?: string;
  step?: number;
  icon?: ReactNode;
  variant?: "default" | "card";
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-3",
        variant === "card"
          ? "rounded-[16px] border border-[var(--border)] bg-[var(--card-bg)] p-4 md:p-5"
          : "border-b border-[var(--border)] px-4 py-3 last:border-b-0 md:px-5 md:py-4",
      )}
    >
      <div className="flex items-start gap-3">
        {step ? (
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--pastel-purple)] text-[12px] font-semibold text-[var(--static-black)]">
            {step}
          </span>
        ) : icon ? (
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--pastel-blue)] text-[var(--static-black)]">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <h2 className="typo-section-title">{title}</h2>
          {description ? <p className="mt-1 typo-helper">{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "green" | "orange" | "purple";
}) {
  const tones = {
    default: "bg-[var(--card-bg)]",
    green: "bg-[rgb(161_227_203/0.18)]",
    orange: "bg-[rgb(255_203_102/0.18)]",
    purple: "bg-[rgb(149_164_252/0.14)]",
  } as const;

  return (
    <div className={cn("rounded-[14px] border border-[var(--border)] px-4 py-3", tones[tone])}>
      <p className="text-[12px] leading-[18px] text-[var(--text-muted)]">{label}</p>
      <p className="mt-0.5 text-[22px] font-semibold leading-8 tracking-tight">{value}</p>
      {hint ? <p className="mt-0.5 text-[12px] leading-[18px] text-[var(--text-muted)]">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-[var(--pastel-blue)] text-[var(--static-black)]">
        <span className="text-[18px]">🍽</span>
      </div>
      <p className="text-[14px] font-semibold leading-5">{title}</p>
      <p className="mt-1 max-w-sm text-[14px] leading-5 text-[var(--text-muted)]">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function SkeletonState({ rows = 8 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2 p-2">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-10 animate-pulse rounded-[8px] bg-[var(--black-05)]"
        />
      ))}
    </div>
  );
}

const thumbColors = ["#E3F5FF", "#E5ECF6", "#BAEDBD", "#FFE999", "#B1E3FF", "#C6C7F8"];

export function Thumb({
  label,
  tone,
}: {
  label: string;
  tone?: "blue" | "purple";
}) {
  const hashed = label.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const background =
    tone === "blue"
      ? "#E3F5FF"
      : tone === "purple"
        ? "#E5ECF6"
        : thumbColors[hashed % thumbColors.length];
  return (
    <span
      className="flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-[var(--static-black)]"
      style={{ background }}
    >
      {label.slice(0, 1).toUpperCase()}
    </span>
  );
}
