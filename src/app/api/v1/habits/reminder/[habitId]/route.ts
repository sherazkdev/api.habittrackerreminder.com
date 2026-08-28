import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api-response";
import { resolveAppUserId } from "@/lib/mobile-auth";
import { deleteReminder } from "@/lib/reminders";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ habitId: string }> },
) {
  const userId = await resolveAppUserId(request);
  if (!userId) {
    return apiError(
      "UNAUTHORIZED",
      "Firebase Bearer token required, or admin Bearer / x-api-key plus x-user-id",
      401,
    );
  }

  const { habitId } = await context.params;
  if (!habitId?.trim()) return apiError("VALIDATION_ERROR", "habitId is required", 400);

  const deleted = await deleteReminder(userId, habitId.trim());
  if (!deleted) return apiError("NOT_FOUND", "Reminder not found", 404);
  return apiOk({ success: true, habitId: habitId.trim() });
}
