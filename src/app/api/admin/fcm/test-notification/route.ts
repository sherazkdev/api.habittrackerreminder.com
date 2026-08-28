import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk } from "@/lib/api-response";
import { requireAdminOrApiKey } from "@/lib/auth/service";
import { isFirebaseConfigured } from "@/lib/env";
import { sendHabitPush } from "@/lib/fcm";

const schema = z.object({
  fcm_token: z.string().trim().min(1),
});

export async function POST(request: NextRequest) {
  const admin = await requireAdminOrApiKey(request);
  if (!admin) return apiError("UNAUTHORIZED", "Authentication required", 401);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("VALIDATION_ERROR", "fcm_token is required", 422);

  if (!isFirebaseConfigured()) {
    return apiError("FIREBASE_NOT_CONFIGURED", "Firebase is not configured", 503);
  }

  const result = await sendHabitPush({
    tokens: [parsed.data.fcm_token],
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
  });
}
