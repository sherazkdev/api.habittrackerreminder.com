import { getMessaging } from "firebase-admin/messaging";
import type { Message } from "firebase-admin/messaging";
import { getFirebaseAdminForPlatform } from "@/lib/firebase-admin";
import { User } from "@/models/User";
import { NotificationDelivery } from "@/models/NotificationDelivery";
import { connectDB } from "@/lib/db";
import { isFirebaseConfigured, type FcmPlatform } from "@/lib/env";

const DEAD_TOKEN_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

function defaultPlatforms(tokens: string[]): FcmPlatform[] {
  return tokens.map(() => "android");
}

export async function sendHabitPush(input: {
  tokens: string[];
  /** One platform per token; required when tokens come from resolvePushTargets. */
  platforms?: FcmPlatform[];
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
  const platforms =
    input.platforms && input.platforms.length === input.tokens.length
      ? input.platforms
      : defaultPlatforms(input.tokens);

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

  const deadTokens: string[] = [];
  let successCount = 0;
  let failureCount = 0;
  let lastError: string | undefined;

  for (let i = 0; i < input.tokens.length; i++) {
    const token = input.tokens[i]!;
    const platform = platforms[i]!;
    const app = getFirebaseAdminForPlatform(platform);
    if (!app) {
      failureCount += 1;
      lastError =
        platform === "android"
          ? "Firebase Admin not configured for Android (set FIREBASE_ANDROID_* or legacy FIREBASE_*)"
          : "Firebase Admin not configured for iOS (set FIREBASE_IOS_* or legacy FIREBASE_*)";
      continue;
    }

    const messaging = getMessaging(app);
    const basePayload = {
      data: {
        type: "habit_reminder",
        habitId: input.habitId,
        habitName: input.habitName,
        notificationBody: input.notificationBody,
      },
    };

    const message: Message =
      platform === "ios"
        ? {
            token,
            ...basePayload,
            apns: {
              headers: { "apns-priority": "10" },
              payload: {
                aps: {
                  alert: {
                    title: input.habitName,
                    body: input.notificationBody,
                  },
                  sound: "default",
                },
              },
            },
          }
        : {
            token,
            ...basePayload,
            android: { priority: "high" },
          };

    try {
      await messaging.send(message);
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
  await User.updateOne(
    { userId },
    { $pull: { fcmTokens: { $in: tokens }, deviceMeta: { token: { $in: tokens } } } },
  );
}
