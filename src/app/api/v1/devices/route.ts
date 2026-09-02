import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk } from "@/lib/api-response";
import { requireMobileApiKey } from "@/lib/mobile-auth";
import { registerOrRefreshDevice, unregisterDeviceByToken } from "@/lib/device-registry";

const registerSchema = z
  .object({
    fcm_token: z.string().trim().min(1).optional(),
    fcmToken: z.string().trim().min(1).optional(),
    previous_fcm_token: z.string().trim().min(1).optional(),
    previousFcmToken: z.string().trim().min(1).optional(),
    platform: z.enum(["android", "ios"]).optional(),
  })
  .transform((value) => ({
    fcm_token: value.fcm_token ?? value.fcmToken ?? "",
    previous_fcm_token: value.previous_fcm_token ?? value.previousFcmToken,
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

export async function POST(request: NextRequest) {
  const apiKeyOk = await requireMobileApiKey(request);
  if (!apiKeyOk) return apiError("UNAUTHORIZED", "Valid x-api-key required", 401);

  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("VALIDATION_ERROR", "fcm_token is required", 400);

  const result = await registerOrRefreshDevice({
    fcmToken: parsed.data.fcm_token,
    previousFcmToken: parsed.data.previous_fcm_token,
    platform: parsed.data.platform,
  });
  if (!result.ok) return apiError(result.code, result.message, result.status);
  return apiOk({ registered: true });
}

export async function DELETE(request: NextRequest) {
  const apiKeyOk = await requireMobileApiKey(request);
  if (!apiKeyOk) return apiError("UNAUTHORIZED", "Valid x-api-key required", 401);

  const parsed = unregisterSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("VALIDATION_ERROR", "fcm_token is required", 400);

  return apiOk(await unregisterDeviceByToken(parsed.data.fcm_token));
}
