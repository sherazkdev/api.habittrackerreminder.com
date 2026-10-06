import { beforeEach, describe, expect, it, vi } from "vitest";

const reminderDeleteMany = vi.fn();
const deliveryDeleteMany = vi.fn();
const userDeleteOne = vi.fn();
const findUser = vi.fn();

vi.mock("@/lib/db", () => ({ connectDB: vi.fn(async () => undefined) }));
vi.mock("@/lib/device-registry", () => ({
  findUserByExactFcmToken: (...args: unknown[]) => findUser(...args),
}));
vi.mock("@/models/Reminder", () => ({
  Reminder: { deleteMany: (...args: unknown[]) => reminderDeleteMany(...args) },
}));
vi.mock("@/models/NotificationDelivery", () => ({
  NotificationDelivery: { deleteMany: (...args: unknown[]) => deliveryDeleteMany(...args) },
}));
vi.mock("@/models/User", () => ({
  User: { deleteOne: (...args: unknown[]) => userDeleteOne(...args) },
}));

import { purgeDeviceDataByFcmToken } from "@/lib/device-privacy";

describe("purgeDeviceDataByFcmToken", () => {
  beforeEach(() => {
    reminderDeleteMany.mockReset();
    deliveryDeleteMany.mockReset();
    userDeleteOne.mockReset();
    findUser.mockReset();
  });

  it("deletes reminders, deliveries, and the user record", async () => {
    findUser.mockResolvedValue({ userId: "device-a", fcmTokens: ["tok"] });
    reminderDeleteMany.mockResolvedValue({ deletedCount: 2 });
    deliveryDeleteMany.mockResolvedValue({ deletedCount: 5 });
    userDeleteOne.mockResolvedValue({ deletedCount: 1 });

    const result = await purgeDeviceDataByFcmToken("tok");
    expect(result).toEqual({
      ok: true,
      userId: "device-a",
      deletedReminders: 2,
      deletedDeliveries: 5,
      deletedUser: true,
      alreadyDeleted: false,
    });
    expect(reminderDeleteMany).toHaveBeenCalledWith({ userId: "device-a" });
    expect(deliveryDeleteMany).toHaveBeenCalledWith({ userId: "device-a" });
    expect(userDeleteOne).toHaveBeenCalledWith({ userId: "device-a" });
  });

  it("is idempotent when the token is already gone", async () => {
    findUser.mockResolvedValue(null);
    const result = await purgeDeviceDataByFcmToken("missing");
    expect(result).toEqual({
      ok: true,
      userId: "",
      deletedReminders: 0,
      deletedDeliveries: 0,
      deletedUser: false,
      alreadyDeleted: true,
    });
    expect(reminderDeleteMany).not.toHaveBeenCalled();
  });
});
