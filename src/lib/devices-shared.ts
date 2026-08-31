export type DevicePlatform = "android" | "ios" | "unknown";

export type DeviceRow = {
  id: string;
  firebaseUid: string;
  platform: DevicePlatform;
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
  unknown: number;
  androidPercent: number;
  iosPercent: number;
  unknownPercent: number;
};

export type DeviceAnalytics = {
  healthSplit: Array<{ label: string; value: number; color: string }>;
  platformSplit: {
    android: number;
    ios: number;
    unknown: number;
    androidPercent: number;
    iosPercent: number;
    unknownPercent: number;
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

export function maskToken(token: string): string {
  if (token.length <= 12) return "••••••••";
  return `${token.slice(0, 6)}…${token.slice(-4)}`;
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
