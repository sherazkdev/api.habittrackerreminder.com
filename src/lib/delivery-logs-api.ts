import { apiGet, apiPost } from "@/lib/api-client";

export type DeliveryLogRow = {
  id: number;
  createdAt: string;
  firebaseUid: string;
  reminderId: number;
  notification: string;
  schedule: string;
  gender: "male" | "female";
  platform: "android" | "ios" | "unknown" | "mixed";
  platformLabel: string;
  tokenCount: number;
  successCount: number;
  failureCount: number;
  status: "delivered" | "partial" | "failed" | "skipped";
  errorMessage: string | null;
  slotKey: string;
};

export type DeliveryLogStats = {
  totalAttempts: number;
  delivered: number;
  failed: number;
  skipped: number;
  partial: number;
  successRatePercent: number;
  failureRatePercent: number;
  tokensDelivered: number;
  tokensFailed: number;
};

export type DeliveryLogAnalytics = {
  deliveryRate: Array<{ label: string; value: number; color: string }>;
  failureReasons: Array<{ reason: string; count: number }>;
  queue: {
    skippedRecent: number;
    schedulerEnabled: boolean;
    mode: "cron";
  };
};

export type DeliveryLogListResponse = {
  items: DeliveryLogRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    nextCursor: number | null;
  };
};

export type DeliveryLogSummaryResponse = {
  stats: DeliveryLogStats;
  analytics: DeliveryLogAnalytics;
  computedAt: string;
};

export type DeliveryLogFilters = {
  status?: "delivered" | "failed" | "partial" | "skipped";
  platform?: "android" | "ios";
  search?: string;
  days?: number;
  page?: number;
  limit?: number;
  cursor?: number;
};

function toQuery(filters: DeliveryLogFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.platform) params.set("platform", filters.platform);
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  if (filters.days) params.set("days", String(filters.days));
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.cursor) params.set("cursor", String(filters.cursor));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function fetchDeliveryLogsSummaryAdmin(
  days = 30,
): Promise<DeliveryLogSummaryResponse> {
  return apiGet<DeliveryLogSummaryResponse>(`/api/admin/delivery-logs/summary?days=${days}`);
}

export async function fetchDeliveryLogsAdmin(
  filters: DeliveryLogFilters = {},
): Promise<DeliveryLogListResponse> {
  return apiGet<DeliveryLogListResponse>(`/api/admin/delivery-logs${toQuery(filters)}`);
}

export async function retryDeliveryLogAdmin(id: number): Promise<void> {
  await apiPost(`/api/admin/delivery-logs/${id}/retry`, {});
}

export function shortUid(uid: string): string {
  if (uid.length <= 12) return uid;
  return `${uid.slice(0, 6)}…${uid.slice(-4)}`;
}

export function formatLogTimestamp(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}
