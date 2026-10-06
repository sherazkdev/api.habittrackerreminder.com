import { describe, expect, it, vi } from "vitest";
import { currentClock } from "@/lib/schedule";

describe("currentClock DST", () => {
  it("uses IANA rules for America/New_York spring forward", () => {
    const duringDst = new Date("2026-06-15T16:30:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(duringDst);
    expect(currentClock("America/New_York")).toEqual({ day: "Monday", time: "12:30" });
    vi.useRealTimers();
  });
});
