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
});
