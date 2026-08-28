import { Reminder } from "@/models/Reminder";
import { User } from "@/models/User";
import { NotificationDelivery } from "@/models/NotificationDelivery";
import { connectDB } from "@/lib/db";
import { computeScheduledTimes, currentClock, dueReminderFilter } from "@/lib/schedule";
import { reminderPayloadSchema, type ReminderPayload } from "@/lib/reminder-validation";
import { removeDeadTokens, sendHabitPush } from "@/lib/fcm";
import { env } from "@/lib/env";

export async function upsertReminder(userId: string, payload: ReminderPayload) {
  await connectDB();
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
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return { habitId: doc.habitId, scheduledTimes: doc.scheduledTimes };
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
  await connectDB();
  const clock = currentClock(env.reminderTimezone());
  void now;
  return Reminder.find(dueReminderFilter(clock)).lean();
}

export async function dispatchDueReminders() {
  await connectDB();
  const clock = currentClock(env.reminderTimezone());
  const due = await Reminder.find(dueReminderFilter(clock)).lean();

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const reminder of due) {
    const user = await User.findOne({ userId: reminder.userId }).lean();
    const tokens = user?.fcmTokens?.filter(Boolean) ?? [];
    if (tokens.length === 0) {
      skipped += 1;
      await NotificationDelivery.create({
        userId: reminder.userId,
        habitId: reminder.habitId,
        habitName: reminder.habitName,
        notificationBody: reminder.notificationBody,
        scheduledTime: clock.time,
        tokenCount: 0,
        status: "skipped",
      });
      continue;
    }

    const result = await sendHabitPush({
      tokens,
      habitId: reminder.habitId,
      habitName: reminder.habitName,
      notificationBody: reminder.notificationBody,
    });
    await removeDeadTokens(reminder.userId, result.deadTokens);

    const status =
      result.successCount === 0
        ? "failed"
        : result.failureCount > 0
          ? "partial"
          : "delivered";
    if (status === "failed") failed += 1;
    else sent += 1;

    await NotificationDelivery.create({
      userId: reminder.userId,
      habitId: reminder.habitId,
      habitName: reminder.habitName,
      notificationBody: reminder.notificationBody,
      scheduledTime: clock.time,
      tokenCount: tokens.length,
      status,
    });
  }

  return {
    timezone: env.reminderTimezone(),
    clock,
    checked: due.length,
    sent,
    failed,
    skipped,
  };
}

export async function registerDevice(userId: string, fcmToken: string, _platform?: string) {
  await connectDB();
  await User.findOneAndUpdate(
    { userId },
    { $addToSet: { fcmTokens: fcmToken } },
    { upsert: true, new: true },
  );
  return { registered: true, userId };
}

export async function unregisterDevice(userId: string, fcmToken: string) {
  await connectDB();
  await User.updateOne({ userId }, { $pull: { fcmTokens: fcmToken } });
  return { unregistered: true, userId };
}
