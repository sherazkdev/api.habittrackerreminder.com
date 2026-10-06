const INSTALLATION_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

export function isValidInstallationId(value: string): boolean {
  return INSTALLATION_ID_RE.test(value.trim());
}

export function normalizeInstallationId(value: string): string {
  return value.trim();
}
