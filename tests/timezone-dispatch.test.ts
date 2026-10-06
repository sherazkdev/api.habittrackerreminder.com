import { describe, expect, it } from "vitest";
import { dueReminderFilter } from "@/lib/schedule";
import { isValidTimezone } from "@/lib/timezone";

describe("isValidTimezone", () => {
  it("accepts IANA zones used by mobile clients", () => {
    expect(isValidTimezone("Asia/Karachi")).toBe(true);
    expect(isValidTimezone("America/New_York")).toBe(true);
    expect(isValidTimezone("Asia/Kolkata")).toBe(true);
  });

  it("rejects invalid names", () => {
    expect(isValidTimezone("")).toBe(false);
    expect(isValidTimezone("Not/AZone")).toBe(false);
  });
});

describe("dueReminderFilter", () => {
  const clock = { day: "Tuesday", time: "20:00" };

  it("scopes due queries to one timezone", () => {
    expect(dueReminderFilter(clock, "America/New_York")).toEqual({
      scheduledTimes: "20:00",
      $and: [
        { $or: [{ days: "Everyday" }, { days: "Tuesday" }] },
        { timezone: "America/New_York" },
      ],
    });
  });

  it("includes legacy reminders missing timezone when matching the server default", () => {
    expect(dueReminderFilter(clock, "Asia/Karachi", "Asia/Karachi")).toEqual({
      scheduledTimes: "20:00",
      $and: [
        { $or: [{ days: "Everyday" }, { days: "Tuesday" }] },
        {
          $or: [
            { timezone: "Asia/Karachi" },
            { timezone: { $exists: false } },
            { timezone: null },
            { timezone: "" },
          ],
        },
      ],
    });
  });
});
