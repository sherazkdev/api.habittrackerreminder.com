import { getMessaging } from "firebase-admin/messaging";
import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { User } from "@/models/User";
import { NotificationDelivery } from "@/models/NotificationDelivery";
import { connectDB } from "@/lib/db";
import { isFirebaseConfigured } from "@/lib/env";

const DEAD_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

export async function sendHabitPush(input: {
  tokens: string[];
  habitId: string;
  habitName: string;
  notificationBody: string;
  userId?: string;
  scheduledTime?: string;
  logDelivery?: boolean;
}): Promise<{
  successCount: number;
  failureCount: number;
  deadTokens: string[];
  status: "delivered" | "partial" | "failed" | "skipped";
  error?: string;
}> {
  if (!isFirebaseConfigured() || input.tokens.length === 0) {
    const status = input.tokens.length === 0 ? "skipped" : "failed";
    if (input.logDelivery && input.userId) {
      await connectDB();
      await NotificationDelivery.create({
        userId: input.userId,
        habitId: input.habitId,
        habitName: input.habitName,
        notificationBody: input.notificationBody,
        scheduledTime: input.scheduledTime ?? "now",
        tokenCount: input.tokens.length,
        status,
      });
    }
    return { successCount: 0, failureCount: input.tokens.length, deadTokens: [], status };
  }

  getFirebaseAdmin();
  const messaging = getMessaging();
  const deadTokens: string[] = [];
  let successCount = 0;
  let failureCount = 0;
  let lastError: string | undefined;

  for (const token of input.tokens) {
    try {
      await messaging.send({
        token,
        notification: {
          title: input.habitName,
          body: input.notificationBody,
        },
        data: { habitId: input.habitId },
        android: { priority: "high" },
      });
      successCount += 1;
    } catch (error) {
      failureCount += 1;
      lastError = error instanceof Error ? error.message : "FCM send failed";
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
      if (DEAD_TOKEN_CODES.has(code)) deadTokens.push(token);
    }
  }

  const status =
    successCount === 0 ? "failed" : failureCount > 0 ? "partial" : "delivered";

  if (input.logDelivery && input.userId) {
    await connectDB();
    await NotificationDelivery.create({
      userId: input.userId,
      habitId: input.habitId,
      habitName: input.habitName,
      notificationBody: input.notificationBody,
      scheduledTime: input.scheduledTime ?? "now",
      tokenCount: input.tokens.length,
      status,
    });
  }

  return { successCount, failureCount, deadTokens, status, error: lastError };
}

export async function removeDeadTokens(userId: string, tokens: string[]) {
  if (tokens.length === 0) return;
  await User.updateOne({ userId }, { $pull: { fcmTokens: { $in: tokens } } });
}
