import { describe, expect, it } from "vitest";
import { tokensForDeviceRecord } from "@/lib/device-tokens";

describe("tokensForDeviceRecord", () => {
  it("uses only tokens on this device record", () => {
    expect(tokensForDeviceRecord(["token-a"])).toEqual({ tokens: ["token-a"] });
  });

  it("never falls back to another registered token", () => {
    const result = tokensForDeviceRecord([]);
    expect(result.tokens).toEqual([]);
    expect(result.skipReason).toBe("No FCM token on this device record");
  });

  it("dedupes empty values on the same record", () => {
    expect(tokensForDeviceRecord(["tok", "", "tok"])).toEqual({ tokens: ["tok"] });
  });

  it("uses only the most recently seen token when multiple are stored", () => {
    const result = tokensForDeviceRecord(["old-token", "new-token"], [
      { token: "old-token", lastSeenAt: new Date("2026-01-01T08:00:00Z") },
      { token: "new-token", lastSeenAt: new Date("2026-06-01T08:00:00Z") },
    ]);
    expect(result).toEqual({ tokens: ["new-token"] });
  });
});
