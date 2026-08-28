import { getAuth } from "firebase-admin/auth";
import type { NextRequest } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { getBearerToken, requireAdminOrApiKey } from "@/lib/auth/service";
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

export async function resolveAppUserId(request: NextRequest): Promise<string | null> {
  const impersonate = request.headers.get("x-user-id")?.trim();
  if (impersonate) {
    const admin = await requireAdminOrApiKey(request);
    if (admin) return impersonate;
  }
  return getFirebaseUserId(request);
}
