import { NextRequest } from "next/server";
import { apiError, apiOkFields } from "@/lib/api-response";
import { deviceResolveError, resolveDeviceByFcmToken } from "@/lib/mobile-auth";
import { parseReminderPayload, upsertReminder } from "@/lib/reminders";

export async function POST(request: NextRequest) {
  const device = await resolveDeviceByFcmToken(request);
  if (!device.ok) return deviceResolveError(device);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid JSON body", 400);
  }

  const parsed = parseReminderPayload(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid reminder payload", 400);
  }

  const result = await upsertReminder(device.userId, parsed.data);
  return apiOkFields(result);
}

export async function DELETE() {
  return apiError("VALIDATION_ERROR", "Use DELETE /api/v1/habits/reminder/{habitId}", 400);
}
