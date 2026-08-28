import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk } from "@/lib/api-response";
import { resolveAppUserId } from "@/lib/mobile-auth";
import { registerDevice, unregisterDevice } from "@/lib/reminders";

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

async function requireUser(request: NextRequest) {
  const userId = await resolveAppUserId(request);
  if (!userId) {
    return {
      ok: false as const,
      error: apiError(
        "UNAUTHORIZED",
        "Firebase Bearer token required, or admin Bearer / x-api-key plus x-user-id",
        401,
      ),
    };
  }
  return { ok: true as const, userId };
}

export async function POST(request: NextRequest) {
  const gate = await requireUser(request);
  if (!gate.ok) return gate.error;
  const userId = gate.userId;

  const parsed = registerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("VALIDATION_ERROR", "fcm_token is required", 400);

  return apiOk(await registerDevice(userId, parsed.data.fcm_token, parsed.data.platform));
}

export async function DELETE(request: NextRequest) {
  const gate = await requireUser(request);
  if (!gate.ok) return gate.error;
  const userId = gate.userId;

  const parsed = unregisterSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("VALIDATION_ERROR", "fcm_token is required", 400);

  return apiOk(await unregisterDevice(userId, parsed.data.fcm_token));
}
