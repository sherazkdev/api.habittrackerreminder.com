export function isValidTimezone(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 64) return false;
  try {
    Intl.DateTimeFormat("en-US", { timeZone: trimmed }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function normalizeTimezone(value: string): string {
  return value.trim();
}
