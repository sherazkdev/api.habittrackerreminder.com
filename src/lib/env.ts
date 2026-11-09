/** Runtime env read — bracket access avoids Next.js build-time inlining of empty Docker secrets. */
function runtimeEnv(name: string): string | undefined {
  return process.env[name];
}

function required(name: string, fallback?: string): string {
  const value = runtimeEnv(name) ?? fallback;
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function optional(name: string, fallback = ""): string {
  return runtimeEnv(name) ?? fallback;
}

export const env = {
  mongodbUri: () => required("MONGODB_URI"),
  jwtAccessSecret: () => required("JWT_ACCESS_SECRET", "dev-access-secret-change-me"),
  jwtRefreshSecret: () => required("JWT_REFRESH_SECRET", "dev-refresh-secret-change-me"),
  jwtAccessExpiresIn: () => optional("JWT_ACCESS_EXPIRES_IN", "15m"),
  jwtRefreshExpiresIn: () => optional("JWT_REFRESH_EXPIRES_IN", "7d"),
  jwtIssuer: () => optional("JWT_ISSUER", "habit-tracker-api"),
  jwtAudience: () => optional("JWT_AUDIENCE", "habit-tracker-admin"),
  refreshCookieName: () => optional("REFRESH_COOKIE_NAME", "babit_refresh"),
  cookieSecure: () => runtimeEnv("COOKIE_SECURE") === "true",
  cookieSameSite: () => (runtimeEnv("COOKIE_SAME_SITE") as "lax" | "strict" | "none") ?? "lax",
  cronSecret: () => optional("CRON_SECRET"),
  firebaseProjectId: () => optional("FIREBASE_PROJECT_ID"),
  firebaseClientEmail: () => optional("FIREBASE_CLIENT_EMAIL"),
  firebasePrivateKey: () => optional("FIREBASE_PRIVATE_KEY").replace(/\\n/g, "\n"),
  firebaseAndroidProjectId: () => optional("FIREBASE_ANDROID_PROJECT_ID"),
  firebaseAndroidClientEmail: () => optional("FIREBASE_ANDROID_CLIENT_EMAIL"),
  firebaseAndroidPrivateKey: () => optional("FIREBASE_ANDROID_PRIVATE_KEY").replace(/\\n/g, "\n"),
  firebaseIosProjectId: () => optional("FIREBASE_IOS_PROJECT_ID"),
  firebaseIosClientEmail: () => optional("FIREBASE_IOS_CLIENT_EMAIL"),
  firebaseIosPrivateKey: () => optional("FIREBASE_IOS_PRIVATE_KEY").replace(/\\n/g, "\n"),
  adminSeedEnabled: () => runtimeEnv("ADMIN_SEED_ENABLED") === "true",
  adminSeedEmail: () => optional("ADMIN_SEED_EMAIL", "admin@habittracker.local"),
  adminSeedPassword: () => optional("ADMIN_SEED_PASSWORD", "admin12345"),
  adminSeedName: () => optional("ADMIN_SEED_NAME", "Admin"),
  appName: () => optional("APP_NAME", "Habit Tracker"),
  appVersion: () => optional("APP_VERSION", "0.1.0"),
  publicUrl: () => optional("API_PUBLIC_URL", "http://localhost:3000"),
  adminUrl: () => optional("ADMIN_PUBLIC_URL", "http://localhost:3000"),
  reminderTimezone: () => optional("REMINDER_TIMEZONE", "Asia/Karachi"),
  mobileRateLimitEnabled: () => runtimeEnv("MOBILE_RATE_LIMIT_ENABLED") !== "false",
  mobileRateLimitWindowMs: () => {
    const raw = Number(optional("MOBILE_RATE_LIMIT_WINDOW_MS", "60000"));
    return Number.isFinite(raw) && raw > 0 ? raw : 60_000;
  },
  mobileRateLimitDevicesPerWindow: () => {
    const raw = Number(optional("MOBILE_RATE_LIMIT_DEVICES_PER_MIN", "30"));
    return Number.isFinite(raw) && raw > 0 ? raw : 30;
  },
  mobileRateLimitRemindersPerWindow: () => {
    const raw = Number(optional("MOBILE_RATE_LIMIT_REMINDERS_PER_MIN", "120"));
    return Number.isFinite(raw) && raw > 0 ? raw : 120;
  },
};

export type FcmPlatform = "android" | "ios";

export type FirebaseServiceAccount = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

function isTripleSet(projectId: string, email: string, key: string): boolean {
  return Boolean(projectId && email && key);
}

/** Credentials for one platform: platform env, else legacy FIREBASE_* */
export function firebaseCredentialsForPlatform(platform: FcmPlatform): FirebaseServiceAccount | null {
  if (platform === "android") {
    if (
      isTripleSet(env.firebaseAndroidProjectId(), env.firebaseAndroidClientEmail(), env.firebaseAndroidPrivateKey())
    ) {
      return {
        projectId: env.firebaseAndroidProjectId(),
        clientEmail: env.firebaseAndroidClientEmail(),
        privateKey: env.firebaseAndroidPrivateKey(),
      };
    }
  } else {
    if (isTripleSet(env.firebaseIosProjectId(), env.firebaseIosClientEmail(), env.firebaseIosPrivateKey())) {
      return {
        projectId: env.firebaseIosProjectId(),
        clientEmail: env.firebaseIosClientEmail(),
        privateKey: env.firebaseIosPrivateKey(),
      };
    }
  }
  if (isTripleSet(env.firebaseProjectId(), env.firebaseClientEmail(), env.firebasePrivateKey())) {
    return {
      projectId: env.firebaseProjectId(),
      clientEmail: env.firebaseClientEmail(),
      privateKey: env.firebasePrivateKey(),
    };
  }
  return null;
}

/** True if we can send to Android targets (split or legacy). */
export function isFirebaseAndroidConfigured(): boolean {
  return firebaseCredentialsForPlatform("android") !== null;
}

/** True if we can send to iOS targets (split or legacy). */
export function isFirebaseIosConfigured(): boolean {
  return firebaseCredentialsForPlatform("ios") !== null;
}

/** True if at least one of legacy, Android, or iOS Admin credentials is complete. */
export function isFirebaseConfigured(): boolean {
  return (
    isTripleSet(env.firebaseProjectId(), env.firebaseClientEmail(), env.firebasePrivateKey()) ||
    isTripleSet(env.firebaseAndroidProjectId(), env.firebaseAndroidClientEmail(), env.firebaseAndroidPrivateKey()) ||
    isTripleSet(env.firebaseIosProjectId(), env.firebaseIosClientEmail(), env.firebaseIosPrivateKey())
  );
}
