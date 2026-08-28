export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_SPECIAL_CHARS = "!@#$%^&*_-+.=?";

const UPPERCASE = /[A-Z]/;
const LOWERCASE = /[a-z]/;
const NUMBER = /\d/;
const SPECIAL = /[!@#$%^&*_+\-=.?]/;

export const PASSWORD_RULES = [
  { key: "length", label: `At least ${PASSWORD_MIN_LENGTH} characters` },
  { key: "uppercase", label: "One uppercase letter (A–Z)" },
  { key: "lowercase", label: "One lowercase letter (a–z)" },
  { key: "number", label: "One number (0–9)" },
  { key: "special", label: `One special character (${PASSWORD_SPECIAL_CHARS})` },
] as const;

export type PasswordRuleKey = (typeof PASSWORD_RULES)[number]["key"];

export type PasswordChecks = Record<PasswordRuleKey, boolean>;

export function evaluatePassword(password: string): PasswordChecks {
  return {
    length: password.length >= PASSWORD_MIN_LENGTH,
    uppercase: UPPERCASE.test(password),
    lowercase: LOWERCASE.test(password),
    number: NUMBER.test(password),
    special: SPECIAL.test(password),
  };
}

export function passwordScore(password: string): number {
  return Object.values(evaluatePassword(password)).filter(Boolean).length;
}

export function isStrongPassword(password: string): boolean {
  return Object.values(evaluatePassword(password)).every(Boolean);
}

export const passwordMeetsPolicy = isStrongPassword;

export function passwordPolicyMessage(): string {
  return `Password must be at least ${PASSWORD_MIN_LENGTH} characters and include an uppercase letter, a lowercase letter, a number, and a special character (${PASSWORD_SPECIAL_CHARS}).`;
}

export function validateNewPassword(newPassword: string, confirmPassword: string, currentPassword?: string) {
  if (!isStrongPassword(newPassword)) {
    return { ok: false as const, code: "WEAK_PASSWORD", message: passwordPolicyMessage() };
  }
  if (newPassword !== confirmPassword) {
    return { ok: false as const, code: "VALIDATION_ERROR", message: "New password and confirmation do not match" };
  }
  if (currentPassword !== undefined && newPassword === currentPassword) {
    return { ok: false as const, code: "VALIDATION_ERROR", message: "New password must differ from the current password" };
  }
  return { ok: true as const };
}
