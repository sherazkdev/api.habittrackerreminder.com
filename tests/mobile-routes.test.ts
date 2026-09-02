import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const requireMobileApiKey = vi.fn();
const registerOrRefreshDevice = vi.fn();
const resolveDeviceByFcmToken = vi.fn();
const upsertReminder = vi.fn();
const deleteReminder = vi.fn();
const sendHabitPush = vi.fn();

vi.mock("@/lib/mobile-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/mobile-auth")>();
  return {
    ...actual,
    requireMobileApiKey: (...args: unknown[]) => requireMobileApiKey(...args),
    resolveDeviceByFcmToken: (...args: unknown[]) => resolveDeviceByFcmToken(...args),
  };
});
vi.mock("@/lib/device-registry", () => ({
  registerOrRefreshDevice: (...args: unknown[]) => registerOrRefreshDevice(...args),
  unregisterDeviceByToken: vi.fn(),
}));
vi.mock("@/lib/reminders", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/reminders")>();
  return {
    ...actual,
    upsertReminder: (...args: unknown[]) => upsertReminder(...args),
    deleteReminder: (...args: unknown[]) => deleteReminder(...args),
  };
});
vi.mock("@/lib/fcm", () => ({
  sendHabitPush: (...args: unknown[]) => sendHabitPush(...args),
  removeDeadTokens: vi.fn(),
}));

import { POST as registerDevice } from "@/app/api/v1/devices/route";
import { POST as createReminder } from "@/app/api/v1/habits/reminder/route";
import { DELETE as deleteHabitReminder } from "@/app/api/v1/habits/reminder/[habitId]/route";

const timerBody = {
  habitId: "habit_001",
  habitName: "Morning Walk",
  notificationBody: "Time for your habit",
  days: ["Everyday"],
  timer: true,
  repeat: false,
  time: "16:30",
};

function post(url: string, headers: Record<string, string>, body: unknown) {
  return new NextRequest(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("POST /api/v1/devices", () => {
  beforeEach(() => {
    requireMobileApiKey.mockReset();
    registerOrRefreshDevice.mockReset();
    sendHabitPush.mockReset();
  });

  it("registers a new token without sending a test push", async () => {
    requireMobileApiKey.mockResolvedValue({ _id: "admin" });
    registerOrRefreshDevice.mockResolvedValue({ ok: true });
    const response = await registerDevice(
      post("http://localhost/api/v1/devices", { "x-api-key": "htk_test" }, {
        fcmToken: "phone-token",
        platform: "android",
      }),
    );
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json).toEqual({ success: true, data: { registered: true } });
    expect(json.data.userId).toBeUndefined();
    expect(sendHabitPush).not.toHaveBeenCalled();
  });

  it("accepts snake_case fcm_token", async () => {
    requireMobileApiKey.mockResolvedValue({ _id: "admin" });
    registerOrRefreshDevice.mockResolvedValue({ ok: true });
    await registerDevice(
      post("http://localhost/api/v1/devices", { "x-api-key": "htk_test" }, {
        fcm_token: "phone-token",
      }),
    );
    expect(registerOrRefreshDevice).toHaveBeenCalledWith({
      fcmToken: "phone-token",
      previousFcmToken: undefined,
      platform: undefined,
    });
  });
});

describe("POST /api/v1/habits/reminder", () => {
  beforeEach(() => {
    resolveDeviceByFcmToken.mockReset();
    upsertReminder.mockReset();
  });

  it("creates a reminder from x-api-key + x-fcm-token without x-user-id", async () => {
    resolveDeviceByFcmToken.mockResolvedValue({ ok: true, userId: "device-a", fcmToken: "phone-a" });
    upsertReminder.mockResolvedValue({ habitId: "habit_001", scheduledTimes: ["16:30"] });
    const response = await createReminder(
      post(
        "http://localhost/api/v1/habits/reminder",
        { "x-api-key": "htk_test", "x-fcm-token": "phone-a" },
        timerBody,
      ),
    );
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.habitId).toBe("habit_001");
    expect(upsertReminder).toHaveBeenCalledWith("device-a", expect.objectContaining({ habitId: "habit_001" }));
  });

  it("returns 400 when x-fcm-token is missing", async () => {
    resolveDeviceByFcmToken.mockResolvedValue({
      ok: false,
      status: 400,
      code: "VALIDATION_ERROR",
      message: "x-fcm-token header is required",
    });
    const response = await createReminder(
      post("http://localhost/api/v1/habits/reminder", { "x-api-key": "htk_test" }, timerBody),
    );
    const json = await response.json();
    expect(response.status).toBe(400);
    expect(json.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 DEVICE_NOT_REGISTERED for an unknown token", async () => {
    resolveDeviceByFcmToken.mockResolvedValue({
      ok: false,
      status: 404,
      code: "DEVICE_NOT_REGISTERED",
      message: "FCM token is not registered. Call POST /api/v1/devices first.",
    });
    const response = await createReminder(
      post(
        "http://localhost/api/v1/habits/reminder",
        { "x-api-key": "htk_test", "x-fcm-token": "unknown" },
        timerBody,
      ),
    );
    const json = await response.json();
    expect(response.status).toBe(404);
    expect(json.error.code).toBe("DEVICE_NOT_REGISTERED");
  });
});

describe("device isolation", () => {
  beforeEach(() => {
    resolveDeviceByFcmToken.mockReset();
    upsertReminder.mockReset();
    deleteReminder.mockReset();
  });

  it("two devices cannot access each other's reminders", async () => {
    resolveDeviceByFcmToken.mockResolvedValue({ ok: true, userId: "device-a", fcmToken: "token-a" });
    upsertReminder.mockResolvedValue({ habitId: "habit_001", scheduledTimes: ["08:00"] });
    await createReminder(
      post(
        "http://localhost/api/v1/habits/reminder",
        { "x-api-key": "htk_test", "x-fcm-token": "token-a" },
        { ...timerBody, time: "08:00" },
      ),
    );
    expect(upsertReminder).toHaveBeenCalledWith("device-a", expect.any(Object));

    resolveDeviceByFcmToken.mockResolvedValue({ ok: true, userId: "device-b", fcmToken: "token-b" });
    deleteReminder.mockResolvedValue(false);
    const del = await deleteHabitReminder(
      new NextRequest("http://localhost/api/v1/habits/reminder/habit_001", {
        method: "DELETE",
        headers: { "x-api-key": "htk_test", "x-fcm-token": "token-b" },
      }),
      { params: Promise.resolve({ habitId: "habit_001" }) },
    );
    expect(deleteReminder).toHaveBeenCalledWith("device-b", "habit_001");
    expect(del.status).toBe(404);
  });
});
