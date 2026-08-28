function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export const env = {
  mongodbUri: () => required("MONGODB_URI"),
  jwtAccessSecret: () => required("JWT_ACCESS_SECRET", "dev-access-secret-change-me"),
  jwtRefreshSecret: () => required("JWT_REFRESH_SECRET", "dev-refresh-secret-change-me"),
  jwtAccessExpiresIn: () => process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
  jwtRefreshExpiresIn: () => process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
  jwtIssuer: () => process.env.JWT_ISSUER ?? "habit-tracker-api",
  jwtAudience: () => process.env.JWT_AUDIENCE ?? "habit-tracker-admin",
  refreshCookieName: () => process.env.REFRESH_COOKIE_NAME ?? "babit_refresh",
  cookieSecure: () => process.env.COOKIE_SECURE === "true",
  cookieSameSite: () => (process.env.COOKIE_SAME_SITE as "lax" | "strict" | "none") ?? "lax",
  cronSecret: () => process.env.CRON_SECRET ?? "",
  firebaseProjectId: () => process.env.FIREBASE_PROJECT_ID ?? "",
  firebaseClientEmail: () => process.env.FIREBASE_CLIENT_EMAIL ?? "",
  firebasePrivateKey: () => process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n") ?? "",
  adminSeedEnabled: () => process.env.ADMIN_SEED_ENABLED === "true",
  adminSeedEmail: () => process.env.ADMIN_SEED_EMAIL ?? "admin@habittracker.local",
  adminSeedPassword: () => process.env.ADMIN_SEED_PASSWORD ?? "admin12345",
  adminSeedName: () => process.env.ADMIN_SEED_NAME ?? "Admin",
  appName: () => process.env.APP_NAME ?? "Habit Tracker",
  appVersion: () => process.env.APP_VERSION ?? "0.1.0",
  publicUrl: () => process.env.API_PUBLIC_URL ?? "http://localhost:3000",
  adminUrl: () => process.env.ADMIN_PUBLIC_URL ?? "http://localhost:3000",
  reminderTimezone: () => process.env.REMINDER_TIMEZONE ?? "Asia/Karachi",
};

export function isFirebaseConfigured(): boolean {
  return Boolean(env.firebaseProjectId() && env.firebaseClientEmail() && env.firebasePrivateKey());
}
