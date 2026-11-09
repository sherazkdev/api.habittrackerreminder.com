import { cert, getApp, initializeApp, type App } from "firebase-admin/app";
import type { FcmPlatform } from "@/lib/env";
import { firebaseCredentialsForPlatform } from "@/lib/env";

const APP_BY_PLATFORM: Record<FcmPlatform, string> = {
  android: "android",
  ios: "ios",
};

function stripWrappingQuotes(value: string) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function normalizePrivateKey(key: string) {
  return stripWrappingQuotes(key).replace(/\\n/g, "\n");
}

/**
 * Returns the Firebase Admin App for the given platform (separate service account per platform when configured).
 * Falls back to legacy single-app init when only FIREBASE_* is set.
 *
 * Uses snake_case service-account fields so Next.js production minify cannot
 * rename camelCase keys that firebase-admin validates as project_id / etc.
 */
export function getFirebaseAdminForPlatform(platform: FcmPlatform): App | null {
  const cred = firebaseCredentialsForPlatform(platform);
  if (!cred) return null;

  const projectId = stripWrappingQuotes(cred.projectId);
  const clientEmail = stripWrappingQuotes(cred.clientEmail);
  const privateKey = normalizePrivateKey(cred.privateKey);
  if (!projectId || !clientEmail || !privateKey) return null;

  const name = APP_BY_PLATFORM[platform];
  try {
    return getApp(name);
  } catch {
    // getApp throws if not found — continue to initialize
  }

  return initializeApp(
    {
      credential: cert({
        // Keep literal snake_case keys (JSON service-account shape).
        project_id: projectId,
        client_email: clientEmail,
        private_key: privateKey,
      } as Parameters<typeof cert>[0]),
    },
    name,
  );
}
