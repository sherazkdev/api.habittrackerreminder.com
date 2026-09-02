export function tokensForDeviceRecord(ownTokens: string[]): {
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
  return { tokens };
}
