import type { NextRequest } from "next/server";
import { getApiKeyHeader } from "@/lib/auth/service";
import { verifyApiKey } from "@/lib/auth/api-keys";
import { findUserByExactFcmToken } from "@/lib/device-registry";
import { apiError } from "@/lib/api-response";

export async function requireMobileApiKey(request: NextRequest) {
  const apiKey = getApiKeyHeader(request);
  if (!apiKey) return null;
  return verifyApiKey(apiKey);
}

export type DeviceResolveOk = { ok: true; userId: string; fcmToken: string };
export type DeviceResolveFail = { ok: false; status: number; code: string; message: string };

export async function resolveDeviceByFcmToken(
  request: NextRequest,
): Promise<DeviceResolveOk | DeviceResolveFail> {
  const apiKeyOk = await requireMobileApiKey(request);
  if (!apiKeyOk) {
    return { ok: false, status: 401, code: "UNAUTHORIZED", message: "Valid x-api-key required" };
  }

  const fcmToken = request.headers.get("x-fcm-token")?.trim();
  if (!fcmToken) {
    return { ok: false, status: 400, code: "VALIDATION_ERROR", message: "x-fcm-token header is required" };
  }

  const user = await findUserByExactFcmToken(fcmToken);
  if (!user) {
    return {
      ok: false,
      status: 404,
      code: "DEVICE_NOT_REGISTERED",
      message: "FCM token is not registered. Call POST /api/v1/devices first.",
    };
  }

  return { ok: true, userId: user.userId, fcmToken };
}

export function deviceResolveError(result: DeviceResolveFail) {
  return apiError(result.code, result.message, result.status);
}
