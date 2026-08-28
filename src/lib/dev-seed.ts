import mongoose from "mongoose";
import { Admin } from "@/models/Admin";
import { hashPassword } from "@/lib/auth/password";
import { connectDB } from "@/lib/db";
import { env } from "@/lib/env";
import { upsertReminder } from "@/lib/reminders";
import type { ReminderPayload } from "@/lib/reminder-validation";

export const DEMO_USER_ID = "seed-dev-user";

export const DEMO_REMINDERS: ReminderPayload[] = [
  {
    habitId: "abc123",
    habitName: "Drink Water",
    notificationBody: "Time for your habit",
    days: ["Everyday"],
    timer: true,
    repeat: false,
    time: "08:00",
  },
  {
    habitId: "xyz789",
    habitName: "Stretch",
    notificationBody: "Time for your habit",
    days: ["Monday", "Wednesday", "Friday"],
    timer: false,
    repeat: true,
    startTime: "09:00",
    endTime: "21:00",
    repeatCount: 4,
  },
];

export type DevSeedResult = {
  admin: { email: string; name: string; created: boolean; passwordReset: boolean };
  demo?: { userId: string; reminders: { habitId: string; scheduledTimes: string[] }[] };
};

export async function runDevSeed(options: { resetAdmin?: boolean; demo?: boolean } = {}) {
  const demo = options.demo !== false;
  await connectDB();

  const email = env.adminSeedEmail().toLowerCase();
  const name = env.adminSeedName();
  const password = env.adminSeedPassword();
  const existing = await Admin.findOne({ email });

  let created = false;
  let passwordReset = false;

  if (!existing) {
    await Admin.create({
      name,
      email,
      passwordHash: await hashPassword(password),
      tokenVersion: 0,
      isActive: true,
    });
    created = true;
  } else if (options.resetAdmin) {
    existing.name = name;
    existing.passwordHash = await hashPassword(password);
    existing.tokenVersion += 1;
    existing.isActive = true;
    await existing.save();
    passwordReset = true;
  }

  const result: DevSeedResult = {
    admin: { email, name, created, passwordReset },
  };

  if (demo) {
    const reminders = [];
    for (const payload of DEMO_REMINDERS) {
      reminders.push(await upsertReminder(DEMO_USER_ID, payload));
    }
    result.demo = { userId: DEMO_USER_ID, reminders };
  }

  return result;
}

export async function disconnectSeed() {
  await mongoose.disconnect();
}
