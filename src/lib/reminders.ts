import { Reminder } from "@/models/Reminder";
import { User } from "@/models/User";
import { NotificationDelivery } from "@/models/NotificationDelivery";
import { connectDB } from "@/lib/db";
import { computeScheduledTimes, currentClock, dueReminderFilter } from "@/lib/schedule";
import { reminderPayloadSchema, type ReminderPayload } from "@/lib/reminder-validation";
import { resolveReminderTimezoneWithSource, type TimezoneSource } from "@/lib/timezone-resolve";

export type { TimezoneSource };
import { wasReminderDeliveredRecently } from "@/lib/delivery-idempotency";
import { tokensForDeviceRecord } from "@/lib/device-tokens";
import { removeDeadTokens, sendHabitPush } from "@/lib/fcm";
import { env } from "@/lib/env";

type ReminderLean = {
  userId: string;
  habitId: string;
  habitName: string;
  notificationBody: string;
  timezone?: string | null;
  days?: string[];
  scheduledTimes?: string[];
};

type DueReminder = ReminderLean & { dueScheduledTime: string };

function effectiveReminderTimezone(reminder: { timezone?: string | null }, defaultTz: string) {
  const value = reminder.timezone?.trim();
  return value || defaultTz;
}

async function listReminderTimezones(): Promise<string[]> {
  await connectDB();
  const defaultTz = env.reminderTimezone();
  const raw = await Reminder.distinct("timezone");
  const set = new Set<string>();
  for (const tz of raw) {
    if (typeof tz === "string" && tz.trim()) set.add(tz.trim());
    else set.add(defaultTz);
  }
  if (set.size === 0) set.add(defaultTz);
  return [...set];
}

async function findDueReminderDocs(): Promise<{ due: DueReminder[]; timezones: string[] }> {
  await connectDB();
  const defaultTz = env.reminderTimezone();
  const timezones = await listReminderTimezones();
  const due: DueReminder[] = [];
  const seen = new Set<string>();

  for (const tz of timezones) {
    // Only the current wall-clock minute — exact scheduled HH:MM, no early/late window.
    const clock = currentClock(tz);
    const filter = dueReminderFilter(clock, tz, defaultTz);
    const batch = await Reminder.find(filter).lean<ReminderLean[]>();
    for (const reminder of batch) {
      const key = `${reminder.userId}|${reminder.habitId}|${clock.time}`;
      if (seen.has(key)) continue;
      seen.add(key);
      due.push({ ...reminder, dueScheduledTime: clock.time });
    }
  }

  return { due, timezones };
}

async function resolvePushTargets(userId: string) {
  const user = await User.findOne({ userId }).lean();
  const ownTokens = user?.fcmTokens?.filter(Boolean) ?? [];
  const deviceMeta = user?.deviceMeta as
    | { token: string; platform?: "android" | "ios"; lastSeenAt?: Date; createdAt?: Date }[]
    | undefined;
  return tokensForDeviceRecord(ownTokens, deviceMeta);
}

/** Send one due reminder. Returns sent | failed | skipped | idempotent. */
async function dispatchOneDueReminder(
  reminder: ReminderLean,
  scheduledTime: string,
): Promise<"sent" | "failed" | "skipped" | "idempotent"> {
  if (await wasReminderDeliveredRecently(reminder.userId, reminder.habitId, scheduledTime)) {
    return "idempotent";
  }

  const resolved = await resolvePushTargets(reminder.userId);
  const tokens = resolved.tokens;
  if (tokens.length === 0) {
    await NotificationDelivery.create({
      userId: reminder.userId,
      habitId: reminder.habitId,
      habitName: reminder.habitName,
      notificationBody: reminder.notificationBody,
      scheduledTime,
      tokenCount: 0,
      status: "skipped",
      skipReason: resolved.skipReason,
    });
    return "skipped";
  }

  const result = await sendHabitPush({
    tokens,
    platforms: resolved.platforms,
    habitId: reminder.habitId,
    habitName: reminder.habitName,
    notificationBody: reminder.notificationBody,
    userId: reminder.userId,
  });
  await removeDeadTokens(reminder.userId, result.deadTokens);

  const status =
    result.successCount === 0 ? "failed" : result.failureCount > 0 ? "partial" : "delivered";

  await NotificationDelivery.create({
    userId: reminder.userId,
    habitId: reminder.habitId,
    habitName: reminder.habitName,
    notificationBody: reminder.notificationBody,
    scheduledTime,
    tokenCount: tokens.length,
    status,
    errorMessage: status === "delivered" ? undefined : result.error,
  });

  return status === "failed" ? "failed" : "sent";
}

export async function upsertReminder(userId: string, payload: ReminderPayload) {
  await connectDB();
  const { timezone, source: timezoneSource } = await resolveReminderTimezoneWithSource(userId, payload);
  const scheduledTimes = computeScheduledTimes(payload);
  const doc = await Reminder.findOneAndUpdate(
    { userId, habitId: payload.habitId },
    {
      userId,
      habitId: payload.habitId,
      habitName: payload.habitName,
      notificationBody: payload.notificationBody,
      days: payload.days,
      timer: payload.timer,
      repeat: payload.repeat,
      time: payload.time,
      startTime: payload.startTime,
      endTime: payload.endTime,
      repeatCount: payload.repeatCount,
      scheduledTimes,
      timezone,
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );

  // Save only — cron delivers at the scheduled minute (with 1-minute grace). No push on save.
  return {
    habitId: doc.habitId,
    scheduledTimes: doc.scheduledTimes,
    timezone: doc.timezone,
    timezoneSource,
  };
}

export async function deleteReminder(userId: string, habitId: string) {
  await connectDB();
  const result = await Reminder.deleteOne({ userId, habitId });
  return result.deletedCount > 0;
}

export async function bulkUpsertReminders(userId: string, payloads: ReminderPayload[]) {
  const results = [];
  for (const payload of payloads) {
    results.push(await upsertReminder(userId, payload));
  }
  return results;
}

export function parseReminderPayload(body: unknown) {
  return reminderPayloadSchema.safeParse(body);
}

export async function getDueReminders(now = new Date()) {
  void now;
  const { due } = await findDueReminderDocs();
  return due;
}

export async function dispatchDueReminders() {
  await connectDB();
  const defaultTz = env.reminderTimezone();
  const { due, timezones } = await findDueReminderDocs();

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const reminder of due) {
    const outcome = await dispatchOneDueReminder(reminder, reminder.dueScheduledTime);
    if (outcome === "sent") sent += 1;
    else if (outcome === "failed") failed += 1;
    else if (outcome === "skipped") skipped += 1;
  }

  return {
    timezone: defaultTz,
    timezonesChecked: timezones,
    checked: due.length,
    sent,
    failed,
    skipped,
  };
}
