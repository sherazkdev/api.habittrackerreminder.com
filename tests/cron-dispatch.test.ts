import { beforeEach, describe, expect, it, vi } from "vitest";

const reminderFind = vi.fn();
const userFindOne = vi.fn();
const deliveryCreate = vi.fn();
const sendHabitPush = vi.fn();
const removeDeadTokens = vi.fn();

vi.mock("@/lib/db", () => ({ connectDB: vi.fn(async () => undefined) }));
vi.mock("@/lib/env", () => ({
  env: { reminderTimezone: () => "Asia/Karachi" },
}));
vi.mock("@/lib/schedule", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/schedule")>();
  return {
    ...actual,
    currentClock: () => ({ day: "Tuesday", time: "16:30" }),
    dueReminderFilter: (clock: { day: string; time: string }) => ({
      scheduledTimes: clock.time,
      $or: [{ days: "Everyday" }, { days: clock.day }],
    }),
  };
});
vi.mock("@/models/Reminder", () => ({
  Reminder: { find: (...args: unknown[]) => reminderFind(...args) },
}));
vi.mock("@/models/User", () => ({
  User: { findOne: (...args: unknown[]) => userFindOne(...args) },
}));
vi.mock("@/models/NotificationDelivery", () => ({
  NotificationDelivery: { create: (...args: unknown[]) => deliveryCreate(...args) },
}));
vi.mock("@/lib/fcm", () => ({
  sendHabitPush: (...args: unknown[]) => sendHabitPush(...args),
  removeDeadTokens: (...args: unknown[]) => removeDeadTokens(...args),
}));

import { dispatchDueReminders } from "@/lib/reminders";

describe("dispatchDueReminders", () => {
  beforeEach(() => {
    reminderFind.mockReset();
    userFindOne.mockReset();
    deliveryCreate.mockReset();
    sendHabitPush.mockReset();
    removeDeadTokens.mockReset();
    reminderFind.mockReturnValue({ lean: async () => [] });
  });

  it("sends only to the FCM token on that reminder's device record", async () => {
    reminderFind.mockReturnValue({
      lean: async () => [
        {
          userId: "device-a",
          habitId: "habit_001",
          habitName: "Morning Walk",
          notificationBody: "Time for your habit",
        },
      ],
    });
    userFindOne.mockReturnValue({ lean: async () => ({ userId: "device-a", fcmTokens: ["token-a"] }) });
    sendHabitPush.mockResolvedValue({ successCount: 1, failureCount: 0, deadTokens: [] });

    const result = await dispatchDueReminders();
    expect(result.sent).toBe(1);
    expect(sendHabitPush).toHaveBeenCalledWith({
      tokens: ["token-a"],
      habitId: "habit_001",
      habitName: "Morning Walk",
      notificationBody: "Time for your habit",
    });
    expect(deliveryCreate).toHaveBeenCalledWith(expect.objectContaining({ tokenCount: 1, status: "delivered" }));
  });

  it("never uses another device's token as a fallback", async () => {
    reminderFind.mockReturnValue({
      lean: async () => [
        {
          userId: "device-empty",
          habitId: "habit_001",
          habitName: "Morning Walk",
          notificationBody: "Time for your habit",
        },
      ],
    });
    userFindOne.mockReturnValue({ lean: async () => ({ userId: "device-empty", fcmTokens: [] }) });

    const result = await dispatchDueReminders();
    expect(result.skipped).toBe(1);
    expect(sendHabitPush).not.toHaveBeenCalled();
    expect(deliveryCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        tokenCount: 0,
        status: "skipped",
        skipReason: "No FCM token on this device record",
      }),
    );
  });

  it("after refresh, the new token on the same record is the one that receives the push", async () => {
    reminderFind.mockReturnValue({
      lean: async () => [
        {
          userId: "device-1",
          habitId: "habit_001",
          habitName: "Morning Walk",
          notificationBody: "Time for your habit",
        },
      ],
    });
    userFindOne.mockReturnValue({ lean: async () => ({ userId: "device-1", fcmTokens: ["new-token"] }) });
    sendHabitPush.mockResolvedValue({ successCount: 1, failureCount: 0, deadTokens: [] });

    await dispatchDueReminders();
    expect(sendHabitPush).toHaveBeenCalledWith(expect.objectContaining({ tokens: ["new-token"] }));
  });
});
