import { NextRequest } from "next/server";
import { apiError, apiOkFields } from "@/lib/api-response";
import { resolveAppUserId } from "@/lib/mobile-auth";
import { parseReminderPayload, upsertReminder } from "@/lib/reminders";

export async function POST(request: NextRequest) {
  const userId = await resolveAppUserId(request);
  if (!userId) {
    return apiError(
      "UNAUTHORIZED",
      "Firebase Bearer token required, or admin Bearer / x-api-key plus x-user-id",
      401,
    );
  }

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

  const result = await upsertReminder(userId, parsed.data);
  return apiOkFields(result);
}

export async function DELETE() {
  return apiError("VALIDATION_ERROR", "Use DELETE /api/v1/habits/reminder/{habitId}", 400);
}
