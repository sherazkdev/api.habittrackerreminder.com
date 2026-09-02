import { createHash } from "crypto";
import { User } from "@/models/User";
import { connectDB } from "@/lib/db";

export function userIdFromFcmToken(fcmToken: string) {
  return `fcm-${createHash("sha256").update(fcmToken).digest("hex").slice(0, 24)}`;
}

export async function registerDevice(
  userId: string,
  fcmToken: string,
  platform?: "android" | "ios",
) {
  await connectDB();
  const now = new Date();
  const user = await User.findOneAndUpdate(
    { userId },
    { $addToSet: { fcmTokens: fcmToken } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
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
}): Promise<RegisterDeviceResult> {
  await connectDB();
  const fcmToken = input.fcmToken;
  const previousFcmToken = input.previousFcmToken;
  const platform = input.platform;

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
    await registerDevice(previousOwner.userId, fcmToken, platform);
    return { ok: true };
  }

  const existing = await User.findOne({ fcmTokens: fcmToken }).lean();
  const userId = existing?.userId ?? userIdFromFcmToken(fcmToken);
  await registerDevice(userId, fcmToken, platform);
  return { ok: true };
}
