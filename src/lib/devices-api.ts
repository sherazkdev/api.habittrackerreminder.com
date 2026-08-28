import { apiDelete, apiGet } from "@/lib/api-client";

export type DeviceRow = {
  id: number;
  firebaseUid: string;
  platform: "android" | "ios";
  fcmToken: string;
  fcmTokenMasked: string;
  status: "active" | "stale";
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
};

export type DeviceStats = {
  total: number;
  active: number;
  stale: number;
  activePercent: number;
  android: number;
  ios: number;
  androidPercent: number;
  iosPercent: number;
};

export type DeviceAnalytics = {
  healthSplit: Array<{ label: string; value: number; color: string }>;
  platformSplit: {
    android: number;
    ios: number;
    androidPercent: number;
    iosPercent: number;
  };
  activity: {
    registeredToday: number;
    refreshedToday: number;
  };
};

export type DeviceListResponse = {
  items: DeviceRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    nextCursor: number | null;
  };
};

export type DeviceSummaryResponse = {
  stats: DeviceStats;
  analytics: DeviceAnalytics;
  computedAt: string;
};

export type DeviceFilters = {
  platform?: "android" | "ios";
  status?: "active" | "stale";
  search?: string;
  page?: number;
  limit?: number;
  cursor?: number;
};

function toQuery(filters: DeviceFilters): string {
  const params = new URLSearchParams();
  if (filters.platform) params.set("platform", filters.platform);
  if (filters.status) params.set("status", filters.status);
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.cursor) params.set("cursor", String(filters.cursor));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function fetchDevicesSummaryAdmin(): Promise<DeviceSummaryResponse> {
  return apiGet<DeviceSummaryResponse>("/api/admin/devices/summary");
}

export async function fetchDevicesAdmin(filters: DeviceFilters = {}): Promise<DeviceListResponse> {
  return apiGet<DeviceListResponse>(`/api/admin/devices${toQuery(filters)}`);
}

export async function deleteDeviceAdmin(id: number): Promise<void> {
  await apiDelete<{ message: string }>(`/api/admin/devices/${id}`);
}

export function shortUid(uid: string): string {
  if (uid.length <= 12) return uid;
  return `${uid.slice(0, 6)}…${uid.slice(-4)}`;
}

export function formatRelativeTime(value: string): string {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60_000) return "Just now";
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
