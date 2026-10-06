import { beforeEach, describe, expect, it, vi } from "vitest";

const findOne = vi.fn();
const findOneAndUpdate = vi.fn();
const updateOne = vi.fn();
const updateMany = vi.fn();

vi.mock("@/lib/db", () => ({ connectDB: vi.fn(async () => undefined) }));
vi.mock("@/models/Reminder", () => ({
  Reminder: { updateMany: (...args: unknown[]) => updateMany(...args) },
}));
vi.mock("@/models/User", () => ({
  User: {
    findOne: (...args: unknown[]) => findOne(...args),
    findOneAndUpdate: (...args: unknown[]) => findOneAndUpdate(...args),
    updateOne: (...args: unknown[]) => updateOne(...args),
    updateMany: (...args: unknown[]) => updateMany(...args),
  },
}));

import {
  registerOrRefreshDevice,
  userIdFromFcmToken,
  userIdFromInstallationId,
} from "@/lib/device-registry";

describe("userIdFromInstallationId", () => {
  it("is stable for the same installation id", () => {
    const id = userIdFromInstallationId("install-abc-12345");
    expect(id).toMatch(/^inst-[0-9a-f]{24}$/);
    expect(userIdFromInstallationId("install-abc-12345")).toBe(id);
    expect(id).not.toBe(userIdFromFcmToken("some-token"));
  });
});

describe("registerOrRefreshDevice installationId", () => {
  beforeEach(() => {
    findOne.mockReset();
    findOneAndUpdate.mockReset();
    updateOne.mockReset();
    updateMany.mockReset();
    findOneAndUpdate.mockResolvedValue({ userId: "inst-user", deviceMeta: [] });
    updateOne.mockResolvedValue({ modifiedCount: 1 });
  });

  function findOneLean(value: unknown) {
    findOne.mockImplementationOnce(() => ({ lean: async () => value }));
  }

  it("reuses the installation record when a new fcm token arrives", async () => {
    const installId = "abcd1234-uuid-style";
    const stableUserId = userIdFromInstallationId(installId);
    findOneLean(null);
    findOneLean({ userId: stableUserId, installationId: installId, fcmTokens: ["old-token"] });

    const result = await registerOrRefreshDevice({
      fcmToken: "brand-new-token",
      installationId: installId,
    });

    expect(result).toEqual({ ok: true });
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { userId: stableUserId },
      expect.objectContaining({ $addToSet: { fcmTokens: "brand-new-token" } }),
      expect.any(Object),
    );
  });
});
