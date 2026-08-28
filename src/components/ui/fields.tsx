"use client";

import { useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icon";

const control =
  "h-9 w-full rounded-[8px] border border-[var(--input-border)] bg-[var(--input-bg)] px-3 text-[14px] leading-5 text-ink outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--border-strong)] disabled:opacity-40";

export function FormField({
  label,
  required,
  hint,
  error,
  children,
  className,
  htmlFor,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  const LabelTag = htmlFor ? "label" : "span";
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <LabelTag {...(htmlFor ? { htmlFor } : {})} className="typo-label">
        {label}
        {required ? <span className="ml-0.5 text-[var(--text-muted)]">*</span> : null}
      </LabelTag>
      {children}
      {error ? (
        <span className="text-[12px] leading-[18px] text-[var(--bright-red)]">{error}</span>
      ) : hint ? (
        <span className="typo-helper">{hint}</span>
      ) : null}
    </div>
  );
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, className)} {...props} />;
}

export function NumberInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="number" className={cn(control, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(control, "h-auto min-h-[88px] py-2 resize-y", className)}
      {...props}
    />
  );
}

export function SearchInput({
  className,
  shortcut,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { shortcut?: string }) {
  return (
    <div className={cn("relative", className)}>
      <Icon
        name="search"
        size={16}
        className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
      />
      <input
        {...props}
        className={cn(
          "h-7 w-full rounded-[8px] border-0 bg-[var(--search-bg)] pl-8 text-[14px] leading-5 text-ink outline-none placeholder:text-[var(--text-muted)]",
          shortcut && "pr-10",
        )}
        placeholder={props.placeholder ?? "Search"}
      />
      {shortcut ? (
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[12px] leading-[18px] text-[var(--text-muted)]">
          {shortcut}
        </span>
      ) : null}
    </div>
  );
}

export function PasswordInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        className={cn(control, "pr-9", className)}
        {...props}
      />
      <button
        type="button"
        className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-ink"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
      >
        <Icon name={visible ? "eyeSlash" : "eye"} size={16} />
      </button>
    </div>
  );
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <div className="relative">
      <select
        className={cn(control, "appearance-none pr-8", className)}
        {...props}
      >
        {children}
      </select>
      <Icon
        name="caretDown"
        size={12}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
      />
    </div>
  );
}

export function Checkbox({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      className={cn("wl-checkbox size-4 shrink-0 cursor-pointer appearance-none rounded-[4px] border border-[var(--border-strong)] bg-transparent", className)}
      {...props}
    />
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2.5"
    >
      <span
        className={cn(
          "inline-flex h-5 w-9 shrink-0 items-center overflow-hidden rounded-full p-[2px] transition-colors",
          checked ? "bg-[var(--text-primary)]" : "bg-[var(--black-20)]",
        )}
      >
        <span
          className={cn(
            "block size-4 rounded-full shadow-[0_0_0_1px_rgb(28_28_28/0.06)] transition-transform",
            checked
              ? "translate-x-4 bg-[var(--page-bg)]"
              : "translate-x-0 bg-[var(--static-white)]",
          )}
        />
      </span>
      {label ? <span className="text-[14px] leading-5">{label}</span> : null}
    </button>
  );
}

export function FileUploadPlaceholder({
  label = "Upload image",
  hint = "PNG or JPG, up to 2MB. Design placeholder only.",
}: {
  label?: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 rounded-[12px] border border-dashed border-[var(--border-strong)] bg-[var(--black-05)] px-4 py-5 text-left transition-colors hover:bg-[var(--surface-hover)]"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--pastel-blue)] text-[var(--static-black)]">
        <Icon name="upload" size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-[14px] leading-5">{label}</p>
        <p className="typo-helper">{hint}</p>
      </div>
    </button>
  );
}
