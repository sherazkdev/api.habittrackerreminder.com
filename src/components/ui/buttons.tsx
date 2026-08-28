import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  loading?: boolean;
  loadingLabel?: string;
};

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-[8px] px-3 h-8 text-[14px] leading-5 font-normal transition-colors duration-150 disabled:opacity-40 disabled:pointer-events-none cursor-pointer";

export function PrimaryButton({ className, loading, loadingLabel, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        base,
        "bg-[var(--text-primary)] text-[var(--page-bg)] hover:opacity-90",
        className,
      )}
      disabled={props.disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <span className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {loadingLabel ?? children}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function PrimaryLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        base,
        "bg-[var(--text-primary)] text-[var(--page-bg)] hover:opacity-90",
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function SecondaryButton({ className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        base,
        "bg-transparent text-ink border border-[var(--border)] hover:bg-[var(--surface-hover)]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function DangerButton({ className, loading, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        base,
        "bg-[var(--bright-red)] text-white hover:opacity-90",
        className,
      )}
      disabled={props.disabled || loading}
      {...props}
    >
      {loading ? "Deleting…" : children}
    </button>
  );
}

export function GhostButton({ className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(base, "bg-transparent text-ink hover:bg-[var(--surface-hover)]", className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function IconButton({
  className,
  active,
  children,
  ...props
}: ButtonProps & { active?: boolean }) {
  return (
    <button
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-[8px] text-ink transition-colors cursor-pointer hover:bg-[var(--surface-hover)] disabled:opacity-40",
        active && "bg-[var(--nav-active-bg)]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function TextLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("text-[14px] leading-5 text-ink hover:opacity-70", className)}>
      {children}
    </Link>
  );
}
