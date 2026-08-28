import { describe, expect, it } from "vitest";
import { reminderPayloadSchema } from "@/lib/reminder-validation";

const timerHabit = {
  habitId: "abc123",
  habitName: "Drink Water",
  notificationBody: "Time for your habit",
  days: ["Everyday"],
  timer: true,
  repeat: false,
  time: "08:00",
};

const repeatHabit = {
  habitId: "xyz789",
  habitName: "Stretch",
  notificationBody: "Time for your habit",
  days: ["Monday", "Wednesday", "Friday"],
  timer: false,
  repeat: true,
  startTime: "09:00",
  endTime: "21:00",
  repeatCount: 4,
};

describe("reminderPayloadSchema", () => {
  it("accepts the spec timer payload", () => {
    expect(reminderPayloadSchema.safeParse(timerHabit).success).toBe(true);
  });

  it("accepts the spec repeat payload", () => {
    expect(reminderPayloadSchema.safeParse(repeatHabit).success).toBe(true);
  });

  it("rejects when timer and repeat are both true or both false", () => {
    expect(reminderPayloadSchema.safeParse({ ...timerHabit, timer: true, repeat: true }).success).toBe(false);
    expect(reminderPayloadSchema.safeParse({ ...timerHabit, timer: false, repeat: false }).success).toBe(false);
  });

  it("rejects empty habitName or notificationBody", () => {
    expect(reminderPayloadSchema.safeParse({ ...timerHabit, habitName: "  " }).success).toBe(false);
    expect(reminderPayloadSchema.safeParse({ ...timerHabit, notificationBody: "" }).success).toBe(false);
  });

  it("rejects empty days", () => {
    expect(reminderPayloadSchema.safeParse({ ...timerHabit, days: [] }).success).toBe(false);
  });

  it("rejects invalid HH:mm and startTime >= endTime", () => {
    expect(reminderPayloadSchema.safeParse({ ...timerHabit, time: "25:00" }).success).toBe(false);
    expect(
      reminderPayloadSchema.safeParse({
        ...repeatHabit,
        startTime: "21:00",
        endTime: "09:00",
      }).success,
    ).toBe(false);
    expect(
      reminderPayloadSchema.safeParse({
        ...repeatHabit,
        startTime: "09:00",
        endTime: "09:00",
      }).success,
    ).toBe(false);
  });

  it("rejects repeatCount below 1", () => {
    expect(reminderPayloadSchema.safeParse({ ...repeatHabit, repeatCount: 0 }).success).toBe(false);
  });
});
