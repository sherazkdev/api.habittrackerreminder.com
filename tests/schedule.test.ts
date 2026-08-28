import { describe, expect, it } from "vitest";
import {
  computeScheduledTimes,
  isReminderDue,
  isValidTime,
  minutesToTime,
  timeToMinutes,
} from "@/lib/schedule";

describe("computeScheduledTimes", () => {
  it("returns the fixed time in timer mode", () => {
    expect(
      computeScheduledTimes({
        timer: true,
        repeat: false,
        time: "08:00",
      }),
    ).toEqual(["08:00"]);
  });

  it("spaces repeat times from start to end inclusive (spec example)", () => {
    expect(
      computeScheduledTimes({
        timer: false,
        repeat: true,
        startTime: "09:00",
        endTime: "21:00",
        repeatCount: 4,
      }),
    ).toEqual(["09:00", "13:00", "17:00", "21:00"]);
  });

  it("fires only at startTime when repeatCount is 1", () => {
    expect(
      computeScheduledTimes({
        timer: false,
        repeat: true,
        startTime: "09:00",
        endTime: "21:00",
        repeatCount: 1,
      }),
    ).toEqual(["09:00"]);
  });

  it("includes both ends when repeatCount is 2", () => {
    expect(
      computeScheduledTimes({
        timer: false,
        repeat: true,
        startTime: "09:00",
        endTime: "10:00",
        repeatCount: 2,
      }),
    ).toEqual(["09:00", "10:00"]);
  });
});

describe("time helpers", () => {
  it("accepts 24-hour HH:mm and rejects invalid values", () => {
    expect(isValidTime("00:00")).toBe(true);
    expect(isValidTime("23:59")).toBe(true);
    expect(isValidTime("24:00")).toBe(false);
    expect(isValidTime("8:00")).toBe(false);
    expect(isValidTime("08:60")).toBe(false);
  });

  it("converts minutes back to HH:mm", () => {
    expect(timeToMinutes("13:00")).toBe(780);
    expect(minutesToTime(780)).toBe("13:00");
  });
});

describe("isReminderDue", () => {
  const stretch = {
    scheduledTimes: ["09:00", "13:00", "17:00", "21:00"],
    days: ["Monday", "Wednesday", "Friday"],
  };

  it("matches Everyday on any weekday when the clock time is scheduled", () => {
    expect(
      isReminderDue(
        { scheduledTimes: ["08:00"], days: ["Everyday"] },
        { day: "Tuesday", time: "08:00" },
      ),
    ).toBe(true);
  });

  it("skips a weekday that is not in days", () => {
    expect(isReminderDue(stretch, { day: "Tuesday", time: "13:00" })).toBe(false);
  });

  it("fires on a listed weekday at a scheduled time", () => {
    expect(isReminderDue(stretch, { day: "Wednesday", time: "13:00" })).toBe(true);
  });

  it("does not delete logic: wrong clock time is simply not due", () => {
    expect(isReminderDue(stretch, { day: "Wednesday", time: "13:01" })).toBe(false);
  });
});
