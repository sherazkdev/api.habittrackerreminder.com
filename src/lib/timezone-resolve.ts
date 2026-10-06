import { User } from "@/models/User";
import { connectDB } from "@/lib/db";
import { env } from "@/lib/env";
import type { ReminderPayload } from "@/lib/reminder-validation";

export type TimezoneSource = "reminder" | "device" | "server_default";

export async function resolveReminderTimezoneWithSource(
  userId: string,
  payload: ReminderPayload,
): Promise<{ timezone: string; source: TimezoneSource }> {
  if (payload.timezone?.trim()) {
    return { timezone: payload.timezone.trim(), source: "reminder" };
  }

  await connectDB();
  const user = await User.findOne({ userId }).lean();
  const fromDevice = user?.timezone?.trim();
  if (fromDevice) {
    return { timezone: fromDevice, source: "device" };
  }

  return { timezone: env.reminderTimezone(), source: "server_default" };
}
