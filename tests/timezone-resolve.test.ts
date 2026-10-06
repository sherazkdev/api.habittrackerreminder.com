import { beforeEach, describe, expect, it, vi } from "vitest";

const findOne = vi.fn();

vi.mock("@/lib/db", () => ({ connectDB: vi.fn(async () => undefined) }));
vi.mock("@/lib/env", () => ({
  env: { reminderTimezone: () => "Asia/Karachi" },
}));
vi.mock("@/models/User", () => ({
  User: { findOne: (...args: unknown[]) => findOne(...args) },
}));

import { resolveReminderTimezoneWithSource } from "@/lib/timezone-resolve";

const basePayload = {
  habitId: "h1",
  habitName: "Water",
  notificationBody: "Time",
  days: ["Everyday"],
  timer: true,
  repeat: false,
  time: "08:00",
};

describe("resolveReminderTimezoneWithSource", () => {
  beforeEach(() => {
    findOne.mockReset();
  });

  it("prefers reminder timezone over device timezone", async () => {
    findOne.mockReturnValue({ lean: async () => ({ timezone: "Asia/Kolkata" }) });
    const result = await resolveReminderTimezoneWithSource("u1", {
      ...basePayload,
      timezone: "America/New_York",
    });
    expect(result).toEqual({ timezone: "America/New_York", source: "reminder" });
  });

  it("uses device timezone when reminder omits timezone", async () => {
    findOne.mockReturnValue({ lean: async () => ({ timezone: "America/Chicago" }) });
    const result = await resolveReminderTimezoneWithSource("u1", basePayload);
    expect(result).toEqual({ timezone: "America/Chicago", source: "device" });
  });

  it("falls back to server default only when device timezone is missing", async () => {
    findOne.mockReturnValue({ lean: async () => ({ timezone: "" }) });
    const result = await resolveReminderTimezoneWithSource("u1", basePayload);
    expect(result).toEqual({ timezone: "Asia/Karachi", source: "server_default" });
  });
});
