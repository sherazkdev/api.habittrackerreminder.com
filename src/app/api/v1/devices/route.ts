import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk } from "@/lib/api-response";
import { requireMobileApiKey } from "@/lib/mobile-auth";
import { registerOrRefreshDevice, unregisterDeviceByToken } from "@/lib/device-registry";
import { enforceMobileRateLimit } from "@/lib/mobile-rate-limit";
import { isValidInstallationId, normalizeInstallationId } from "@/lib/installation-id";
import { isValidTimezone, normalizeTimezone } from "@/lib/timezone";

const registerSchema = z
  .object({
    fcm_token: z.string().trim().min(1).optional(),
    fcmToken: z.string().trim().min(1).optional(),
    previous_fcm_token: z.string().trim().min(1).optional(),
    previousFcmToken: z.string().trim().min(1).optional(),
    platform: z.enum(["android", "ios"]).optional(),
    timezone: z.string().trim().min(1).optional(),
    time_zone: z.string().trim().min(1).optional(),
    installationId: z.string().trim().min(1).optional(),
    installation_id: z.string().trim().min(1).optional(),
  })
  .transform((value) => ({
    fcm_token: value.fcm_token ?? value.fcmToken ?? "",
    previous_fcm_token: value.previous_fcm_token ?? value.previousFcmToken,
    platform: value.platform,
    timezone: value.timezone ?? value.time_zone,
    installation_id: value.installationId ?? value.installation_id,
  }))
  .refine((value) => value.fcm_token.length > 0, "fcm_token is required")
  .superRefine((value, ctx) => {
    if (value.timezone && !isValidTimezone(value.timezone)) {
      ctx.addIssue({
        code: "custom",
        message: "timezone must be a valid IANA name (e.g. America/New_York)",
        path: ["timezone"],
      });
    }
    if (value.installation_id && !isValidInstallationId(value.installation_id)) {
      ctx.addIssue({
        code: "custom",
        message: "installationId must be 8-64 characters (letters, numbers, _ or -)",
        path: ["installationId"],
      });
    }
  });

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
  const limited = enforceMobileRateLimit(request, "devices");
  if (limited) return limited;

  const apiKeyOk = await requireMobileApiKey(request);
  if (!apiKeyOk) return apiError("UNAUTHORIZED", "Valid x-api-key required", 401);

  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("VALIDATION_ERROR", "fcm_token is required", 400);

  const result = await registerOrRefreshDevice({
    fcmToken: parsed.data.fcm_token,
    previousFcmToken: parsed.data.previous_fcm_token,
    platform: parsed.data.platform,
    timezone: parsed.data.timezone ? normalizeTimezone(parsed.data.timezone) : undefined,
    installationId: parsed.data.installation_id
      ? normalizeInstallationId(parsed.data.installation_id)
      : undefined,
  });
  if (!result.ok) return apiError(result.code, result.message, result.status);
  return apiOk({ registered: true });
}

export async function DELETE(request: NextRequest) {
  const limited = enforceMobileRateLimit(request, "devices");
  if (limited) return limited;

  const apiKeyOk = await requireMobileApiKey(request);
  if (!apiKeyOk) return apiError("UNAUTHORIZED", "Valid x-api-key required", 401);

  const parsed = unregisterSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("VALIDATION_ERROR", "fcm_token is required", 400);

  return apiOk(await unregisterDeviceByToken(parsed.data.fcm_token));
}
