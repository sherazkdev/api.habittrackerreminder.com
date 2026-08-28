import { describe, expect, it } from "vitest";
import { dateKeyInZone, deliveryRatePercent, shiftDateKey } from "@/lib/dashboard-analytics";

describe("deliveryRatePercent", () => {
  it("is 100 when nothing was attempted", () => {
    expect(deliveryRatePercent(0, 0)).toBe(100);
  });

  it("ignores skipped sends and rounds the success share", () => {
    expect(deliveryRatePercent(8, 2)).toBe(80);
    expect(deliveryRatePercent(1, 2)).toBe(33);
  });
});

describe("zoned date keys", () => {
  it("shifts a calendar key without using the server timezone", () => {
    expect(shiftDateKey("2026-08-28", -1)).toBe("2026-08-27");
    expect(shiftDateKey("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("formats a Karachi calendar date", () => {
    const utcEvening = new Date("2026-08-27T22:00:00.000Z");
    expect(dateKeyInZone(utcEvening, "Asia/Karachi")).toBe("2026-08-28");
  });
});
