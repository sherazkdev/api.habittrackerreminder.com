import { beforeEach, describe, expect, it, vi } from "vitest";

const findOne = vi.fn();
const findOneAndUpdate = vi.fn();
const updateOne = vi.fn();
const updateMany = vi.fn();

vi.mock("@/lib/db", () => ({ connectDB: vi.fn(async () => undefined) }));
vi.mock("@/models/User", () => ({
  User: {
    findOne: (...args: unknown[]) => findOne(...args),
    findOneAndUpdate: (...args: unknown[]) => findOneAndUpdate(...args),
    updateOne: (...args: unknown[]) => updateOne(...args),
    updateMany: (...args: unknown[]) => updateMany(...args),
  },
}));

import { registerOrRefreshDevice, userIdFromFcmToken } from "@/lib/device-registry";

describe("userIdFromFcmToken", () => {
  it("is a stable hash of the token, not a client-supplied id", () => {
    const first = userIdFromFcmToken("token-a");
    expect(first).toMatch(/^fcm-[0-9a-f]{24}$/);
    expect(userIdFromFcmToken("token-a")).toBe(first);
    expect(userIdFromFcmToken("token-b")).not.toBe(first);
  });
});

describe("registerOrRefreshDevice", () => {
  beforeEach(() => {
    findOne.mockReset();
    findOneAndUpdate.mockReset();
    updateOne.mockReset();
    updateMany.mockReset();
    findOneAndUpdate.mockResolvedValue({ userId: "internal", deviceMeta: [] });
    updateOne.mockResolvedValue({ modifiedCount: 1 });
  });

  function findOneLean(value: unknown) {
    findOne.mockImplementationOnce(() => ({ lean: async () => value }));
  }

  it("creates an internal record for a new token", async () => {
    findOneLean(null);
    const result = await registerOrRefreshDevice({ fcmToken: "new-token", platform: "android" });
    expect(result).toEqual({ ok: true });
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { userId: userIdFromFcmToken("new-token") },
      { $addToSet: { fcmTokens: "new-token" } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  });

  it("reuses the existing record for the same token", async () => {
    findOneLean({ userId: "existing-device", fcmTokens: ["same-token"], deviceMeta: [] });
    const result = await registerOrRefreshDevice({ fcmToken: "same-token" });
    expect(result).toEqual({ ok: true });
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { userId: "existing-device" },
      { $addToSet: { fcmTokens: "same-token" } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  });

  it("replaces the previous token on the same record and keeps that record", async () => {
    findOneLean({ userId: "device-1", fcmTokens: ["old-token"] });
    findOneLean(null);
    const result = await registerOrRefreshDevice({
      fcmToken: "new-token",
      previousFcmToken: "old-token",
    });
    expect(result).toEqual({ ok: true });
    expect(updateOne).toHaveBeenCalledWith(
      { userId: "device-1" },
      { $pull: { fcmTokens: "old-token", deviceMeta: { token: "old-token" } } },
    );
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { userId: "device-1" },
      { $addToSet: { fcmTokens: "new-token" } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  });

  it("returns 404 when the previous token is unknown", async () => {
    findOneLean(null);
    const result = await registerOrRefreshDevice({
      fcmToken: "new-token",
      previousFcmToken: "missing-old",
    });
    expect(result).toMatchObject({ ok: false, code: "PREVIOUS_DEVICE_TOKEN_NOT_FOUND", status: 404 });
    expect(findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("returns 409 when the new token belongs to another record", async () => {
    findOneLean({ userId: "device-1", fcmTokens: ["old-token"] });
    findOneLean({ userId: "device-2", fcmTokens: ["new-token"] });
    const result = await registerOrRefreshDevice({
      fcmToken: "new-token",
      previousFcmToken: "old-token",
    });
    expect(result).toMatchObject({ ok: false, code: "FCM_TOKEN_CONFLICT", status: 409 });
  });
});
