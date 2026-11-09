import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk } from "@/lib/api-response";
import { requireAdminOrApiKey } from "@/lib/auth/service";
import { connectDB } from "@/lib/db";
import { isFirebaseConfigured, type FcmPlatform } from "@/lib/env";
import { sendHabitPush } from "@/lib/fcm";
import { User } from "@/models/User";

const schema = z.object({
  fcm_token: z.string().trim().min(1),
  /** Optional — when omitted, resolved from the registered device record */
  platform: z.enum(["android", "ios"]).optional(),
});

async function resolvePlatformForToken(token: string, explicit?: FcmPlatform): Promise<FcmPlatform> {
  if (explicit) return explicit;
  await connectDB();
  const user = await User.findOne({
    $or: [{ fcmTokens: token }, { "deviceMeta.token": token }],
  })
    .select({ deviceMeta: 1 })
    .lean();
  const meta = user?.deviceMeta?.find((row: { token?: string; platform?: string }) => row.token === token);
  if (meta?.platform === "android" || meta?.platform === "ios") return meta.platform;
  return "android";
}

export async function POST(request: NextRequest) {
  const admin = await requireAdminOrApiKey(request);
  if (!admin) return apiError("UNAUTHORIZED", "Authentication required", 401);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("VALIDATION_ERROR", "fcm_token is required", 422);

  if (!isFirebaseConfigured()) {
    return apiError("FIREBASE_NOT_CONFIGURED", "Firebase is not configured", 503);
  }

  const platform = await resolvePlatformForToken(parsed.data.fcm_token, parsed.data.platform);

  const result = await sendHabitPush({
    tokens: [parsed.data.fcm_token],
    platforms: [platform],
    userId: admin._id.toString(),
    habitId: "test",
    habitName: "Test Reminder",
    notificationBody: "Time for your habit — this is a test reminder",
    scheduledTime: "now",
    logDelivery: true,
  });

  return apiOk({
    successCount: result.successCount,
    failureCount: result.failureCount,
    status: result.status,
    error: result.error,
    platform,
  });
}
