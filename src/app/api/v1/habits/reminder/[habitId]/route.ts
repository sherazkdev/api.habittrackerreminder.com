import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api-response";
import { resolveAppUser } from "@/lib/mobile-auth";
import { deleteReminder } from "@/lib/reminders";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ habitId: string }> },
) {
  const auth = await resolveAppUser(request);
  if (!auth.ok) return apiError("UNAUTHORIZED", auth.message, 401);
  const userId = auth.userId;

  const { habitId } = await context.params;
  if (!habitId?.trim()) return apiError("VALIDATION_ERROR", "habitId is required", 400);

  const deleted = await deleteReminder(userId, habitId.trim());
  if (!deleted) return apiError("NOT_FOUND", "Reminder not found", 404);
  return NextResponse.json({ success: true, habitId: habitId.trim() });
}
