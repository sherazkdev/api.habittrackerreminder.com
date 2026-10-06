import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api-response";
import { purgeDeviceDataByFcmToken } from "@/lib/device-privacy";
import { enforceMobileRateLimit } from "@/lib/mobile-rate-limit";
import { requireMobileApiKey } from "@/lib/mobile-auth";

export async function DELETE(request: NextRequest) {
  const limited = enforceMobileRateLimit(request, "devices");
  if (limited) return limited;

  const apiKeyOk = await requireMobileApiKey(request);
  if (!apiKeyOk) return apiError("UNAUTHORIZED", "Valid x-api-key required", 401);

  const fcmToken = request.headers.get("x-fcm-token")?.trim();
  if (!fcmToken) {
    return apiError("VALIDATION_ERROR", "x-fcm-token header is required", 400);
  }

  const result = await purgeDeviceDataByFcmToken(fcmToken);

  return apiOk({
    deletedReminders: result.deletedReminders,
    deletedDeliveries: result.deletedDeliveries,
    deletedUser: result.deletedUser,
    alreadyDeleted: result.alreadyDeleted,
  });
}
