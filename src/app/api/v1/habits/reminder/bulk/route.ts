import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOkFields } from "@/lib/api-response";
import { deviceResolveError, resolveDeviceByFcmToken } from "@/lib/mobile-auth";
import { bulkUpsertReminders, parseReminderPayload } from "@/lib/reminders";
import { reminderPayloadSchema } from "@/lib/reminder-validation";

export async function POST(request: NextRequest) {
  const device = await resolveDeviceByFcmToken(request);
  if (!device.ok) return deviceResolveError(device);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Invalid JSON body", 400);
  }

  const parsed = z.array(reminderPayloadSchema).min(1).safeParse(body);
  if (!parsed.success) {
    const first = body && Array.isArray(body) ? parseReminderPayload(body[0]) : null;
    const message = first && !first.success
      ? first.error.issues[0]?.message
      : parsed.error.issues[0]?.message;
    return apiError("VALIDATION_ERROR", message ?? "Body must be a non-empty array of reminders", 400);
  }

  const results = await bulkUpsertReminders(device.userId, parsed.data);
  return apiOkFields({
    results: results.map((item) => ({ success: true, ...item })),
  });
}
