import type { FcmPlatform } from "@/lib/env";

type DeviceMetaRow = {
  token: string;
  platform?: FcmPlatform;
  lastSeenAt?: Date;
  createdAt?: Date;
};

function metaTime(row: DeviceMetaRow) {
  return new Date(row.lastSeenAt ?? row.createdAt ?? 0).getTime();
}

/**
 * Resolve which FCM tokens to notify for a device/user record.
 * When both Android and iOS tokens exist (shared installationId), send one
 * most-recently-seen token per platform so both phones get the reminder.
 */
export function tokensForDeviceRecord(
  ownTokens: string[],
  deviceMeta?: DeviceMetaRow[],
): {
  tokens: string[];
  /** Same length as tokens — used to pick Android vs iOS Firebase Admin */
  platforms: FcmPlatform[];
  skipReason?: string;
} {
  const tokens = [...new Set(ownTokens.filter(Boolean))];
  if (tokens.length === 0) {
    return {
      tokens: [],
      platforms: [],
      skipReason: "No FCM token on this device record",
    };
  }

  const platformFor = (token: string): FcmPlatform =>
    deviceMeta?.find((row) => row.token === token)?.platform ?? "android";

  if (tokens.length === 1) {
    return {
      tokens,
      platforms: [platformFor(tokens[0]!)],
    };
  }

  if (deviceMeta?.length) {
    const ranked = deviceMeta
      .filter((row) => tokens.includes(row.token))
      .sort((a, b) => metaTime(b) - metaTime(a));

    const chosenTokens: string[] = [];
    const chosenPlatforms: FcmPlatform[] = [];
    const seenPlatforms = new Set<FcmPlatform>();

    for (const row of ranked) {
      const platform = row.platform === "ios" || row.platform === "android" ? row.platform : platformFor(row.token);
      if (seenPlatforms.has(platform)) continue;
      seenPlatforms.add(platform);
      chosenTokens.push(row.token);
      chosenPlatforms.push(platform);
    }

    if (chosenTokens.length > 0) {
      return { tokens: chosenTokens, platforms: chosenPlatforms };
    }
  }

  // No usable meta ranking — keep previous single-token fallback (last registered).
  const last = tokens[tokens.length - 1]!;
  return {
    tokens: [last],
    platforms: [platformFor(last)],
  };
}
