import { apiDelete, apiGet, apiPatch } from "@/lib/api-client";

export type WorkoutReminderRow = {
  id: number;
  firebaseUid: string;
  hour: number;
  minute: number;
  days: number[];
  enabled: boolean;
  gender: "male" | "female";
  timezone: string;
  schedule: string;
  nextRun: string | null;
  nextRunLabel: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WorkoutReminderStats = {
  total: number;
  enabled: number;
  paused: number;
  dueToday: number;
  enabledPercent: number;
};

export type WorkoutReminderAnalytics = {
  statusSplit: Array<{ label: string; value: number; color: string }>;
  genderSplit: {
    male: number;
    female: number;
    malePercent: number;
    femalePercent: number;
  };
  upcomingToday: Array<{ time: string; timezone: string; count: number }>;
};

export type WorkoutReminderListResponse = {
  items: WorkoutReminderRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    nextCursor: number | null;
  };
};

export type WorkoutReminderSummaryResponse = {
  stats: WorkoutReminderStats;
  analytics: WorkoutReminderAnalytics;
  timezones: string[];
  computedAt: string;
};

export type WorkoutReminderFilters = {
  gender?: "male" | "female";
  status?: "enabled" | "paused";
  timezone?: string;
  search?: string;
  page?: number;
  limit?: number;
  cursor?: number;
};

function toQuery(filters: WorkoutReminderFilters): string {
  const params = new URLSearchParams();
  if (filters.gender) params.set("gender", filters.gender);
  if (filters.status) params.set("status", filters.status);
  if (filters.timezone) params.set("timezone", filters.timezone);
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.cursor) params.set("cursor", String(filters.cursor));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function fetchWorkoutRemindersSummaryAdmin(): Promise<WorkoutReminderSummaryResponse> {
  return apiGet<WorkoutReminderSummaryResponse>("/api/admin/workout-reminders/summary");
}

export async function fetchWorkoutRemindersAdmin(
  filters: WorkoutReminderFilters = {},
): Promise<WorkoutReminderListResponse> {
  return apiGet<WorkoutReminderListResponse>(`/api/admin/workout-reminders${toQuery(filters)}`);
}

export async function toggleWorkoutReminderAdmin(id: number, enabled: boolean): Promise<WorkoutReminderRow> {
  return apiPatch<WorkoutReminderRow>(`/api/admin/workout-reminders/${id}/toggle`, { enabled });
}

export async function deleteWorkoutReminderAdmin(id: number): Promise<void> {
  await apiDelete<{ message: string }>(`/api/admin/workout-reminders/${id}`);
}

export function shortUid(uid: string): string {
  if (uid.length <= 12) return uid;
  return `${uid.slice(0, 6)}…${uid.slice(-4)}`;
}
