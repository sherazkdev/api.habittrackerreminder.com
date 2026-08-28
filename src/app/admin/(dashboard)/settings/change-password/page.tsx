"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FormField, PasswordInput } from "@/components/ui/fields";
import { PrimaryButton } from "@/components/ui/buttons";
import { Icon } from "@/components/ui/icon";
import { ApiError } from "@/lib/api-client";
import { changePassword } from "@/lib/auth-api";
import { clearAccessToken } from "@/lib/auth-session";
import {
  evaluatePassword,
  passwordMeetsPolicy,
  passwordScore,
  PASSWORD_RULES,
} from "@/lib/auth/password-policy";
import { cn } from "@/lib/cn";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const checks = useMemo(() => evaluatePassword(nextPassword), [nextPassword]);
  const score = passwordScore(nextPassword);
  const match = confirmPassword.length > 0 && nextPassword === confirmPassword;
  const strength =
    score <= 1 ? { label: "Very weak", color: "var(--bright-red)", width: "20%" } :
    score === 2 ? { label: "Weak", color: "var(--bright-orange)", width: "40%" } :
    score === 3 ? { label: "Fair", color: "var(--bright-yellow)", width: "60%" } :
    score === 4 ? { label: "Strong", color: "var(--bright-purple)", width: "80%" } :
    { label: "Excellent", color: "var(--status-active)", width: "100%" };

  const canSubmit =
    Boolean(currentPassword) &&
    passwordMeetsPolicy(nextPassword) &&
    match &&
    nextPassword !== currentPassword &&
    !loading;

  return (
    <div className="mx-auto flex w-full max-w-[880px] flex-col gap-5 pb-8">
      <div>
        <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">Security</p>
        <h1 className="text-[22px] font-semibold leading-8 tracking-tight">Change password</h1>
        <p className="mt-1 max-w-xl text-[13px] leading-5 text-[var(--text-muted)]">
          New passwords need a capital letter, a number, and a special character like <code>_</code> or <code>@</code>.
          All sessions are signed out after a successful change.
        </p>
      </div>

      <form
        className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]"
        onSubmit={(event) => {
          event.preventDefault();
          setSuccess("");
          if (!canSubmit) {
            setError("Meet every security rule and confirm the new password.");
            return;
          }
          setError("");
          setLoading(true);
          void (async () => {
            try {
              await changePassword({
                currentPassword,
                newPassword: nextPassword,
                confirmPassword,
              });
              clearAccessToken();
              setSuccess("Password updated. Redirecting to sign in…");
              window.setTimeout(() => {
                router.replace("/admin/login?reason=password-changed");
              }, 1200);
            } catch (err) {
              setError(err instanceof ApiError ? err.message : "Failed to update password.");
            } finally {
              setLoading(false);
            }
          })();
        }}
      >
        <section className="rounded-[18px] border border-[var(--border)] bg-[var(--card-bg)] p-5">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-[var(--pastel-purple)] text-[var(--static-black)]">
              <Icon name="lock" size={16} />
            </span>
            <div>
              <h2 className="text-[14px] font-semibold">Credentials</h2>
              <p className="text-[12px] text-[var(--text-muted)]">Shown only to you. Never stored in logs.</p>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <FormField label="Current password" required>
              <PasswordInput
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </FormField>
            <FormField label="New password" required>
              <PasswordInput
                autoComplete="new-password"
                value={nextPassword}
                onChange={(event) => setNextPassword(event.target.value)}
              />
            </FormField>
            <FormField label="Confirm new password" required>
              <PasswordInput
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </FormField>
            {confirmPassword ? (
              <p className={cn("text-[12px]", match ? "text-[var(--status-active)]" : "text-[var(--bright-red)]")}>
                {match ? "Passwords match" : "Passwords do not match"}
              </p>
            ) : null}
            {error ? <p className="text-[12px] text-[var(--bright-red)]">{error}</p> : null}
            {success ? <p className="text-[12px] text-[var(--status-active)]">{success}</p> : null}
            <PrimaryButton type="submit" loading={loading} disabled={!canSubmit} className="h-10 w-full">
              Update password
            </PrimaryButton>
          </div>
        </section>

        <aside className="rounded-[18px] border border-[var(--border)] bg-[var(--card-bg)] p-5">
          <h2 className="text-[14px] font-semibold">Password strength</h2>
          <p className="mt-1 text-[12px] text-[var(--text-muted)]">{nextPassword ? strength.label : "Start typing to check"}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--black-10)]">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: nextPassword ? strength.width : "0%", background: strength.color }}
            />
          </div>
          <ul className="mt-5 flex flex-col gap-2.5">
            {PASSWORD_RULES.map((rule) => {
              const ok = checks[rule.key];
              return (
                <li key={rule.key} className="flex items-center gap-2 text-[13px]">
                  <span
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full",
                      ok ? "bg-[rgb(74_167_133/0.16)] text-[var(--status-active)]" : "bg-[var(--black-05)] text-[var(--text-muted)]",
                    )}
                  >
                    <Icon name={ok ? "check" : "minus"} size={12} />
                  </span>
                  <span className={ok ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}>{rule.label}</span>
                </li>
              );
            })}
          </ul>
          <div className="mt-5 rounded-[12px] bg-[var(--black-05)] px-3 py-3 text-[12px] leading-[18px] text-[var(--text-muted)]">
            After the change, every admin session and refresh cookie is revoked. Sign in again with the new password.
          </div>
        </aside>
      </form>
    </div>
  );
}
