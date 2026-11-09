import { describe, expect, it } from "vitest";
import { tokensForDeviceRecord } from "@/lib/device-tokens";

describe("tokensForDeviceRecord", () => {
  it("uses only tokens on this device record", () => {
    expect(tokensForDeviceRecord(["token-a"])).toEqual({
      tokens: ["token-a"],
      platforms: ["android"],
    });
  });

  it("never falls back to another registered token", () => {
    const result = tokensForDeviceRecord([]);
    expect(result.tokens).toEqual([]);
    expect(result.platforms).toEqual([]);
    expect(result.skipReason).toBe("No FCM token on this device record");
  });

  it("dedupes empty values on the same record", () => {
    expect(tokensForDeviceRecord(["tok", "", "tok"])).toEqual({
      tokens: ["tok"],
      platforms: ["android"],
    });
  });

  it("keeps one most-recent token per platform when both Android and iOS exist", () => {
    const result = tokensForDeviceRecord(["old-android", "ios-token", "new-android"], [
      { token: "old-android", platform: "android", lastSeenAt: new Date("2026-01-01T08:00:00Z") },
      { token: "ios-token", platform: "ios", lastSeenAt: new Date("2026-03-01T08:00:00Z") },
      { token: "new-android", platform: "android", lastSeenAt: new Date("2026-06-01T08:00:00Z") },
    ]);
    expect(result).toEqual({
      tokens: ["new-android", "ios-token"],
      platforms: ["android", "ios"],
    });
  });

  it("preserves platform from deviceMeta for the chosen token", () => {
    const result = tokensForDeviceRecord(["ios-tok"], [
      { token: "ios-tok", platform: "ios", lastSeenAt: new Date() },
    ]);
    expect(result).toEqual({ tokens: ["ios-tok"], platforms: ["ios"] });
  });
});
