import { apiGet, apiPost } from "@/lib/api-client";

export type FcmOverviewStats = {
  registeredDevices: number;
  activeDevices: number;
  activeReminders: number;
  enabledReminderPercent: number;
  sentToday: number;
  failedToday: number;
  deliveryRatePercent: number;
  failureRatePercent: number;
};

export type FcmDeliveryChartPoint = {
  date: string;
  label: string;
  delivered: number;
  failed: number;
};

export type FcmRecentDeliveryRow = {
  id: number;
  createdAt: string;
  firebaseUid: string;
  reminderId: number;
  notification: string;
  schedule: string;
  gender: "male" | "female";
  tokenCount: number;
  status: "delivered" | "partial" | "failed" | "skipped";
  skipReason?: string;
};

export type FcmActivityItem = {
  id: string;
  type: "delivery" | "device_registered" | "device_refreshed";
  message: string;
  createdAt: string;
  tone: "success" | "warning" | "info";
};

export type FcmSystemStatus = {
  firebaseAdmin: "connected" | "degraded" | "offline";
  scheduler: "connected" | "degraded" | "offline";
  api: "connected" | "degraded" | "offline";
  firebaseConfigured: boolean;
  schedulerEnabled: boolean;
};

export type FcmOverviewResponse = {
  stats: FcmOverviewStats;
  flow: {
    mobileApp: "connected" | "degraded" | "offline";
    apiServer: "connected" | "degraded" | "offline";
    firebaseFcm: "connected" | "degraded" | "offline";
    userDevice: "connected" | "degraded" | "offline";
  };
  chart: FcmDeliveryChartPoint[];
  recentDeliveries: FcmRecentDeliveryRow[];
  activity: FcmActivityItem[];
  system: FcmSystemStatus;
  computedAt: string;
};

export async function fetchFcmOverviewAdmin(): Promise<FcmOverviewResponse> {
  return apiGet<FcmOverviewResponse>("/api/admin/fcm/overview");
}

export async function sendFcmTestNotificationAdmin(
  fcmToken: string,
): Promise<{ successCount: number; failureCount: number; status?: string; error?: string }> {
  return apiPost<{ successCount: number; failureCount: number; status?: string; error?: string }>(
    "/api/admin/fcm/test-notification",
    { fcm_token: fcmToken },
  );
}

export function shortUid(uid: string): string {
  if (uid.length <= 12) return uid;
  return `${uid.slice(0, 6)}…${uid.slice(-4)}`;
}

export function formatDeliveryTime(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
