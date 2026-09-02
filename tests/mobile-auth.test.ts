import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const verifyApiKey = vi.fn();
const findUserByExactFcmToken = vi.fn();

vi.mock("@/lib/auth/api-keys", () => ({
  verifyApiKey: (...args: unknown[]) => verifyApiKey(...args),
}));
vi.mock("@/lib/device-registry", () => ({
  findUserByExactFcmToken: (...args: unknown[]) => findUserByExactFcmToken(...args),
}));

import { resolveDeviceByFcmToken } from "@/lib/mobile-auth";

function requestWith(headers: Record<string, string>) {
  return new NextRequest("http://localhost/api/v1/habits/reminder", { headers });
}

describe("resolveDeviceByFcmToken", () => {
  beforeEach(() => {
    verifyApiKey.mockReset();
    findUserByExactFcmToken.mockReset();
  });

  it("requires x-api-key", async () => {
    const result = await resolveDeviceByFcmToken(requestWith({ "x-fcm-token": "tok" }));
    expect(result).toMatchObject({ ok: false, status: 401, code: "UNAUTHORIZED" });
  });

  it("requires x-fcm-token and does not read x-user-id", async () => {
    verifyApiKey.mockResolvedValue({ _id: "admin" });
    const result = await resolveDeviceByFcmToken(
      requestWith({ "x-api-key": "htk_test", "x-user-id": "ignored" }),
    );
    expect(result).toMatchObject({ ok: false, status: 400, code: "VALIDATION_ERROR" });
    expect(findUserByExactFcmToken).not.toHaveBeenCalled();
  });

  it("returns 404 DEVICE_NOT_REGISTERED for an unknown token", async () => {
    verifyApiKey.mockResolvedValue({ _id: "admin" });
    findUserByExactFcmToken.mockResolvedValue(null);
    const result = await resolveDeviceByFcmToken(
      requestWith({ "x-api-key": "htk_test", "x-fcm-token": "unknown" }),
    );
    expect(result).toMatchObject({ ok: false, status: 404, code: "DEVICE_NOT_REGISTERED" });
  });

  it("resolves the exact registered token to its internal record", async () => {
    verifyApiKey.mockResolvedValue({ _id: "admin" });
    findUserByExactFcmToken.mockResolvedValue({ userId: "fcm-abc", fcmTokens: ["phone-token"] });
    const result = await resolveDeviceByFcmToken(
      requestWith({ "x-api-key": "htk_test", "x-fcm-token": "phone-token" }),
    );
    expect(result).toEqual({ ok: true, userId: "fcm-abc", fcmToken: "phone-token" });
    expect(findUserByExactFcmToken).toHaveBeenCalledWith("phone-token");
  });
});
