import { apiGet } from "@/lib/api-client";

export type DashboardAnalytics = {
  users: number;
  reminders: number;
  registeredDevices: number;
  deliveriesToday: number;
  sentToday: number;
  failedToday: number;
  deliveryRate: number;
  deliveryRatePercent?: number;
  usersWithDevices: number;
  usersWithoutDevices: number;
  weekDeliveries: number;
  weekDelta: number;
  weekChart: Array<{ date: string; label: string; delivered: number; failed: number; skipped: number }>;
  hourly: Array<{ label: string; count: number }>;
  reminderModes: Array<{ label: string; value: number; color: string }>;
  weekdayBars: Array<{ label: string; value: number }>;
  statusBreakdown: Array<{ label: string; value: number; color: string }>;
  recentDeliveries: Array<{
    id: string;
    habitName: string;
    status: string;
    createdAt: string;
    tokenCount: number;
  }>;
  stale?: boolean;
  cached?: boolean;
  generatedAt?: string;
};

export async function fetchDashboardAnalytics(): Promise<DashboardAnalytics> {
  return apiGet<DashboardAnalytics>("/api/admin/dashboard");
}

export function formatStatValue(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function relativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
