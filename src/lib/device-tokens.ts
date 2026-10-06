type DeviceMetaRow = { token: string; lastSeenAt?: Date; createdAt?: Date };

export function tokensForDeviceRecord(
  ownTokens: string[],
  deviceMeta?: DeviceMetaRow[],
): {
  tokens: string[];
  skipReason?: string;
} {
  const tokens = [...new Set(ownTokens.filter(Boolean))];
  if (tokens.length === 0) {
    return {
      tokens: [],
      skipReason: "No FCM token on this device record",
    };
  }
  if (tokens.length === 1) return { tokens };

  if (deviceMeta?.length) {
    const ranked = deviceMeta
      .filter((row) => tokens.includes(row.token))
      .sort((a, b) => {
        const ta = new Date(a.lastSeenAt ?? a.createdAt ?? 0).getTime();
        const tb = new Date(b.lastSeenAt ?? b.createdAt ?? 0).getTime();
        return tb - ta;
      });
    if (ranked[0]) return { tokens: [ranked[0].token] };
  }

  return { tokens: [tokens[tokens.length - 1]!] };
}
