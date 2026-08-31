import { getAuth } from "firebase-admin/auth";
import type { NextRequest } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { getApiKeyHeader, getBearerToken, requireAdminOrApiKey } from "@/lib/auth/service";
import { isFirebaseConfigured } from "@/lib/env";

export async function getFirebaseUserId(request: NextRequest): Promise<string | null> {
  const token = getBearerToken(request);
  if (!token || !isFirebaseConfigured()) return null;
  try {
    getFirebaseAdmin();
    const decoded = await getAuth().verifyIdToken(token);
    return decoded.uid ?? null;
  } catch {
    return null;
  }
}

export async function resolveAppUser(request: NextRequest): Promise<
  { ok: true; userId: string } | { ok: false; message: string }
> {
  const userIdHeader = request.headers.get("x-user-id")?.trim();
  const apiKey = getApiKeyHeader(request);
  const firebaseUid = await getFirebaseUserId(request);

  if (userIdHeader) {
    const admin = await requireAdminOrApiKey(request);
    if (admin) return { ok: true, userId: userIdHeader };
    if (apiKey) return { ok: false, message: "Invalid x-api-key" };
    return { ok: false, message: "x-user-id requires a valid x-api-key or admin Bearer token" };
  }

  if (firebaseUid) return { ok: true, userId: firebaseUid };

  if (apiKey) {
    const admin = await requireAdminOrApiKey(request);
    if (!admin) return { ok: false, message: "Invalid x-api-key" };
    return {
      ok: false,
      message:
        "x-api-key is not enough. Also send header x-user-id with the user's Firebase uid (not the FCM token).",
    };
  }

  return {
    ok: false,
    message: "Firebase Bearer token required, or admin x-api-key plus x-user-id",
  };
}

export async function resolveAppUserId(request: NextRequest): Promise<string | null> {
  const result = await resolveAppUser(request);
  return result.ok ? result.userId : null;
}
