"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { IconButton, PrimaryButton } from "@/components/ui/buttons";
import { FormField, PasswordInput, TextInput } from "@/components/ui/fields";
import { useTheme } from "@/components/theme/theme-provider";
import { apiPost, ApiError } from "@/lib/api-client";
import { getAccessToken, setAccessToken, subscribeAccessToken } from "@/lib/auth-session";
import { safeAdminNext } from "@/lib/admin-path";

function getLoginReason() {
  return new URLSearchParams(window.location.search).get("reason") ?? "";
}

export default function LoginPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState("admin@habittracker.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const token = useSyncExternalStore(subscribeAccessToken, getAccessToken, () => null);
  const reason = useSyncExternalStore(() => () => {}, getLoginReason, () => "");
  const passwordChanged = reason === "password-changed";
  const sessionExpired = reason === "expired";

  useEffect(() => {
    if (!token) return;
    const next = safeAdminNext(new URLSearchParams(window.location.search).get("next"));
    router.replace(next);
  }, [router, token]);

  return (
    <div className="wl-page-scroll h-full overflow-y-auto bg-[var(--page-bg)]">
      <div className="relative flex min-h-full items-center justify-center px-4 py-16">
      <div className="absolute left-6 top-6 flex items-center gap-3">
        <Link href="/" className="text-[12px] text-[var(--text-muted)] hover:text-ink hover:underline">
          ← Home
        </Link>
      </div>
      <div className="absolute right-6 top-6">
        <IconButton aria-label="Toggle theme" onClick={toggleTheme}>
          <Icon name={theme === "dark" ? "moon" : "sun"} size={16} />
        </IconButton>
      </div>
      <form
        className="wl-enter w-full max-w-[360px] rounded-[16px] border border-[var(--border)] bg-[var(--card-bg)] p-5 md:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (!email || !password) {
            setError("Email and password are required.");
            return;
          }
          setError("");
          setLoading(true);
          void (async () => {
            try {
              const data = await apiPost<{ accessToken: string }>(
                "/api/admin/login",
                { email, password },
                { auth: false },
              );
              setAccessToken(data.accessToken);
              const next = safeAdminNext(new URLSearchParams(window.location.search).get("next"));
              router.push(next);
            } catch (err) {
              setError(
                err instanceof ApiError ? err.message : "Sign in failed. Is the API running?",
              );
            } finally {
              setLoading(false);
            }
          })();
        }}
      >
        <div className="mb-6 flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-full bg-[var(--pastel-blue)] text-[var(--static-black)]">
            <Icon name="leaf" size={14} />
          </span>
          <p className="text-[14px] leading-5">Habit Tracker</p>
        </div>
        <h1 className="mb-1 text-[18px] font-semibold leading-7 tracking-tight">Sign in</h1>
        <p className="mb-5 text-[12px] leading-[18px] text-[var(--text-muted)]">
          Admin JWT for the dashboard. Use an API key in Swagger if you prefer.
        </p>
        {passwordChanged ? (
          <p className="mb-4 text-[12px] leading-[18px] text-[var(--status-active)]">
            Password updated. Sign in with your new password.
          </p>
        ) : sessionExpired ? (
          <p className="mb-4 text-[12px] leading-[18px] text-[var(--text-muted)]">
            Session expired. Sign in to continue.
          </p>
        ) : null}
        <div className="flex flex-col gap-4">
          <FormField label="Email" required error={error && !email ? error : undefined}>
            <TextInput
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </FormField>
          <FormField label="Password" required error={error && !password ? error : undefined}>
            <PasswordInput
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
            />
          </FormField>
          {error && email && password ? (
            <p className="text-[12px] leading-[18px] text-[var(--bright-red)]">{error}</p>
          ) : null}
          <PrimaryButton type="submit" loading={loading} className="h-9 w-full">
            Sign In
          </PrimaryButton>
        </div>
      </form>
      </div>
    </div>
  );
}
