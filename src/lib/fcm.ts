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

function otherPlatform(platform: FcmPlatform): FcmPlatform {
  return platform === "android" ? "ios" : "android";
}

function errorCode(error: unknown): string {
  return typeof error === "object" && error && "code" in error ? String(error.code) : "";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "FCM send failed";
}

function isSenderIdMismatch(error: unknown): boolean {
  const code = errorCode(error);
  const message = errorMessage(error);
  return (
    code === "messaging/mismatched-credential" ||
    /senderid mismatch/i.test(message) ||
    /mismatched-credential/i.test(message)
  );
}

function buildMessage(
  platform: FcmPlatform,
  token: string,
  input: {
    habitId: string;
    habitName: string;
    notificationBody: string;
  },
): Message {
  const basePayload = {
    data: {
      type: "habit_reminder",
      habitId: input.habitId,
      habitName: input.habitName,
      notificationBody: input.notificationBody,
    },
  };

  if (platform === "ios") {
    return {
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
    };
  }

  return {
    token,
    ...basePayload,
    android: { priority: "high" },
  };
}

async function rememberCorrectedPlatform(userId: string | undefined, token: string, platform: FcmPlatform) {
  if (!userId) return;
  await User.updateOne(
    { userId, "deviceMeta.token": token },
    { $set: { "deviceMeta.$.platform": platform, "deviceMeta.$.lastSeenAt": new Date() } },
  );
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
    const error =
      input.tokens.length === 0 ? undefined : "Firebase Admin is not configured";
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
        errorMessage: error,
      });
    }
    return { successCount: 0, failureCount: input.tokens.length, deadTokens: [], status, error };
  }

  const deadTokens: string[] = [];
  let successCount = 0;
  let failureCount = 0;
  let lastError: string | undefined;

  for (let i = 0; i < input.tokens.length; i++) {
    const token = input.tokens[i]!;
    let platform = platforms[i]!;
    let app = getFirebaseAdminForPlatform(platform);

    if (!app) {
      const fallback = otherPlatform(platform);
      app = getFirebaseAdminForPlatform(fallback);
      if (app) platform = fallback;
    }

    if (!app) {
      failureCount += 1;
      lastError =
        platform === "android"
          ? "Firebase Admin not configured for Android (set FIREBASE_ANDROID_* or legacy FIREBASE_*)"
          : "Firebase Admin not configured for iOS (set FIREBASE_IOS_* or legacy FIREBASE_*)";
      console.error("[fcm]", lastError, { habitId: input.habitId, platform });
      continue;
    }

    try {
      await getMessaging(app).send(
        buildMessage(platform, token, {
          habitId: input.habitId,
          habitName: input.habitName,
          notificationBody: input.notificationBody,
        }),
      );
      successCount += 1;
      if (platform !== platforms[i]) {
        await rememberCorrectedPlatform(input.userId, token, platform);
      }
      continue;
    } catch (error) {
      if (isSenderIdMismatch(error)) {
        const alt = otherPlatform(platform);
        const altApp = getFirebaseAdminForPlatform(alt);
        if (altApp) {
          try {
            await getMessaging(altApp).send(
              buildMessage(alt, token, {
                habitId: input.habitId,
                habitName: input.habitName,
                notificationBody: input.notificationBody,
              }),
            );
            successCount += 1;
            await rememberCorrectedPlatform(input.userId, token, alt);
            console.warn("[fcm] SenderId mismatch recovered via platform fallback", {
              habitId: input.habitId,
              from: platform,
              to: alt,
            });
            continue;
          } catch (fallbackError) {
            failureCount += 1;
            lastError = errorMessage(fallbackError);
            const code = errorCode(fallbackError);
            if (DEAD_TOKEN_CODES.has(code)) deadTokens.push(token);
            console.error("[fcm] send failed after platform fallback", {
              habitId: input.habitId,
              platform: alt,
              code,
              error: lastError,
            });
            continue;
          }
        }
      }

      failureCount += 1;
      lastError = errorMessage(error);
      const code = errorCode(error);
      if (DEAD_TOKEN_CODES.has(code)) deadTokens.push(token);
      console.error("[fcm] send failed", {
        habitId: input.habitId,
        platform,
        code,
        error: lastError,
      });
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
      errorMessage: status === "delivered" ? undefined : lastError,
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
