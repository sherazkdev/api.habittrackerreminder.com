import { createHash } from "crypto";
import { User } from "@/models/User";
import { Reminder } from "@/models/Reminder";
import { connectDB } from "@/lib/db";

export function userIdFromFcmToken(fcmToken: string) {
  return `fcm-${createHash("sha256").update(fcmToken).digest("hex").slice(0, 24)}`;
}

export function userIdFromInstallationId(installationId: string) {
  return `inst-${createHash("sha256").update(installationId).digest("hex").slice(0, 24)}`;
}

async function resolveUserIdForRegistration(fcmToken: string, installationId?: string) {
  const existingByToken = await User.findOne({ fcmTokens: fcmToken }).lean();
  if (existingByToken) {
    return { userId: existingByToken.userId, installationIdToSet: installationId };
  }

  if (installationId) {
    const existingByInstall = await User.findOne({ installationId }).lean();
    if (existingByInstall) {
      return { userId: existingByInstall.userId, installationIdToSet: undefined };
    }
    return { userId: userIdFromInstallationId(installationId), installationIdToSet: installationId };
  }

  return { userId: userIdFromFcmToken(fcmToken), installationIdToSet: undefined };
}

export async function registerDevice(
  userId: string,
  fcmToken: string,
  platform?: "android" | "ios",
  timezone?: string,
  installationId?: string,
) {
  await connectDB();
  const now = new Date();
  const user = await User.findOneAndUpdate(
    { userId },
    {
      $addToSet: { fcmTokens: fcmToken },
      ...(timezone || installationId
        ? {
            $set: {
              ...(timezone ? { timezone } : {}),
              ...(installationId ? { installationId } : {}),
            },
          }
        : {}),
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );

  const hasMeta = Boolean(user.deviceMeta?.some((item: { token: string }) => item.token === fcmToken));
  if (hasMeta) {
    await User.updateOne(
      { userId, "deviceMeta.token": fcmToken },
      {
        $set: {
          "deviceMeta.$.lastSeenAt": now,
          ...(platform ? { "deviceMeta.$.platform": platform } : {}),
        },
      },
    );
  } else {
    await User.updateOne(
      { userId },
      {
        $push: {
          deviceMeta: {
            token: fcmToken,
            ...(platform ? { platform } : {}),
            lastSeenAt: now,
            createdAt: now,
          },
        },
      },
    );
  }

  if (timezone) {
    await Reminder.updateMany({ userId }, { $set: { timezone } });
  }

  return { registered: true as const };
}

export async function unregisterDeviceByToken(fcmToken: string) {
  await connectDB();
  const result = await User.updateMany(
    { fcmTokens: fcmToken },
    { $pull: { fcmTokens: fcmToken, deviceMeta: { token: fcmToken } } },
  );
  return { unregistered: result.modifiedCount > 0 };
}

export async function findUserByExactFcmToken(fcmToken: string) {
  await connectDB();
  return User.findOne({ fcmTokens: fcmToken }).lean();
}

export type RegisterDeviceResult =
  | { ok: true }
  | {
      ok: false;
      code: "PREVIOUS_DEVICE_TOKEN_NOT_FOUND" | "FCM_TOKEN_CONFLICT";
      message: string;
      status: 404 | 409;
    };

export async function registerOrRefreshDevice(input: {
  fcmToken: string;
  previousFcmToken?: string;
  platform?: "android" | "ios";
  timezone?: string;
  installationId?: string;
}): Promise<RegisterDeviceResult> {
  await connectDB();
  const fcmToken = input.fcmToken;
  const previousFcmToken = input.previousFcmToken;
  const platform = input.platform;
  const timezone = input.timezone;
  const installationId = input.installationId;

  if (previousFcmToken && previousFcmToken !== fcmToken) {
    const previousOwner = await User.findOne({ fcmTokens: previousFcmToken }).lean();
    if (!previousOwner) {
      return {
        ok: false,
        code: "PREVIOUS_DEVICE_TOKEN_NOT_FOUND",
        message: "previousFcmToken is not registered",
        status: 404,
      };
    }

    const newOwner = await User.findOne({ fcmTokens: fcmToken }).lean();
    if (newOwner && newOwner.userId !== previousOwner.userId) {
      return {
        ok: false,
        code: "FCM_TOKEN_CONFLICT",
        message: "fcmToken already belongs to another device record",
        status: 409,
      };
    }

    await User.updateOne(
      { userId: previousOwner.userId },
      { $pull: { fcmTokens: previousFcmToken, deviceMeta: { token: previousFcmToken } } },
    );
    await registerDevice(
      previousOwner.userId,
      fcmToken,
      platform,
      timezone,
      installationId ?? previousOwner.installationId,
    );
    return { ok: true };
  }

  const { userId, installationIdToSet } = await resolveUserIdForRegistration(fcmToken, installationId);
  await registerDevice(userId, fcmToken, platform, timezone, installationIdToSet);
  return { ok: true };
}
