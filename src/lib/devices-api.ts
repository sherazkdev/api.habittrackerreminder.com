import { apiDelete, apiGet } from "@/lib/api-client";
import type { DeviceFilters, DeviceListResponse, DeviceSummaryResponse } from "@/lib/devices-shared";

export type {
  DeviceAnalytics,
  DeviceFilters,
  DeviceListResponse,
  DevicePlatform,
  DeviceRow,
  DeviceStats,
  DeviceSummaryResponse,
} from "@/lib/devices-shared";
export { formatRelativeTime, maskToken, shortUid } from "@/lib/devices-shared";

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

export async function deleteDeviceAdmin(id: string): Promise<void> {
  await apiDelete<{ message: string }>(`/api/admin/devices/${encodeURIComponent(id)}`);
}
