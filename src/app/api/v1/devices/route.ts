import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk } from "@/lib/api-response";
import { requireAdminOrApiKey } from "@/lib/auth/service";
import { getFirebaseUserId } from "@/lib/mobile-auth";
import {
  registerDevice,
  resolveUserIdForFcmToken,
  unregisterDevice,
  unregisterDeviceByToken,
} from "@/lib/reminders";

const registerSchema = z
  .object({
    fcm_token: z.string().trim().min(1).optional(),
    fcmToken: z.string().trim().min(1).optional(),
    platform: z.enum(["android", "ios"]).optional(),
  })
  .transform((value) => ({
    fcm_token: value.fcm_token ?? value.fcmToken ?? "",
    platform: value.platform,
  }))
  .refine((value) => value.fcm_token.length > 0, "fcm_token is required");

const unregisterSchema = z
  .object({
    fcm_token: z.string().trim().min(1).optional(),
    fcmToken: z.string().trim().min(1).optional(),
  })
  .transform((value) => ({
    fcm_token: value.fcm_token ?? value.fcmToken ?? "",
  }))
  .refine((value) => value.fcm_token.length > 0, "fcm_token is required");

async function requireDevicesAuth(request: NextRequest) {
  const firebaseUid = await getFirebaseUserId(request);
  if (firebaseUid) return { ok: true as const, via: "firebase" as const, userId: firebaseUid };

  const admin = await requireAdminOrApiKey(request);
  if (admin) return { ok: true as const, via: "api-key" as const, userId: null };

  return {
    ok: false as const,
    error: apiError("UNAUTHORIZED", "Firebase Bearer token or x-api-key required", 401),
  };
}

export async function POST(request: NextRequest) {
  const auth = await requireDevicesAuth(request);
  if (!auth.ok) return auth.error;

  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("VALIDATION_ERROR", "fcm_token is required", 400);

  const fcmToken = parsed.data.fcm_token;
  const userId = auth.via === "firebase" ? auth.userId : await resolveUserIdForFcmToken(fcmToken);
  return apiOk(await registerDevice(userId, fcmToken, parsed.data.platform));
}

export async function DELETE(request: NextRequest) {
  const auth = await requireDevicesAuth(request);
  if (!auth.ok) return auth.error;

  const parsed = unregisterSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("VALIDATION_ERROR", "fcm_token is required", 400);

  if (auth.via === "firebase") {
    return apiOk(await unregisterDevice(auth.userId, parsed.data.fcm_token));
  }
  return apiOk(await unregisterDeviceByToken(parsed.data.fcm_token));
}
