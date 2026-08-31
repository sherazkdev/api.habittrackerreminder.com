import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import type {
  DeviceAnalytics,
  DeviceFilters,
  DeviceListResponse,
  DeviceRow,
  DeviceStats,
  DeviceSummaryResponse,
} from "@/lib/devices-shared";
import { maskToken } from "@/lib/devices-shared";

const STALE_MS = 7 * 24 * 60 * 60 * 1000;

type DeviceMetaLean = {
  token: string;
  platform?: "android" | "ios";
  lastSeenAt?: Date;
  createdAt?: Date;
};

type UserLean = {
  userId: string;
  fcmTokens?: string[];
  deviceMeta?: DeviceMetaLean[];
  createdAt?: Date;
  updatedAt?: Date;
};

export function encodeDeviceId(userId: string, token: string) {
  return Buffer.from(`${userId}\n${token}`, "utf8").toString("base64url");
}

export function decodeDeviceId(id: string): { userId: string; token: string } | null {
  try {
    const raw = Buffer.from(id, "base64url").toString("utf8");
    const sep = raw.indexOf("\n");
    if (sep <= 0 || sep === raw.length - 1) return null;
    return { userId: raw.slice(0, sep), token: raw.slice(sep + 1) };
  } catch {
    return null;
  }
}

function pct(part: number, total: number) {
  return total ? Math.round((part / total) * 100) : 0;
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function flattenDevices(users: UserLean[]): DeviceRow[] {
  const now = Date.now();
  const rows: DeviceRow[] = [];

  for (const user of users) {
    const tokens = user.fcmTokens?.filter(Boolean) ?? [];
    const metaByToken = new Map((user.deviceMeta ?? []).map((item) => [item.token, item]));
    for (const token of tokens) {
      const meta = metaByToken.get(token);
      const lastSeen = meta?.lastSeenAt ?? user.updatedAt ?? user.createdAt ?? new Date();
      const created = meta?.createdAt ?? user.createdAt ?? lastSeen;
      const status = now - new Date(lastSeen).getTime() <= STALE_MS ? "active" : "stale";
      rows.push({
        id: encodeDeviceId(user.userId, token),
        firebaseUid: user.userId,
        platform: meta?.platform ?? "unknown",
        fcmToken: token,
        fcmTokenMasked: maskToken(token),
        status,
        lastSeenAt: new Date(lastSeen).toISOString(),
        createdAt: new Date(created).toISOString(),
        updatedAt: new Date(user.updatedAt ?? lastSeen).toISOString(),
      });
    }
  }

  return rows.sort((a, b) => +new Date(b.lastSeenAt) - +new Date(a.lastSeenAt));
}

function applyFilters(rows: DeviceRow[], filters: DeviceFilters) {
  const search = filters.search?.trim().toLowerCase();
  return rows.filter((row) => {
    if (filters.platform && row.platform !== filters.platform) return false;
    if (filters.status && row.status !== filters.status) return false;
    if (search) {
      const hay = `${row.firebaseUid} ${row.fcmToken} ${row.fcmTokenMasked}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });
}

function buildStats(rows: DeviceRow[]): DeviceStats {
  const total = rows.length;
  const active = rows.filter((row) => row.status === "active").length;
  const stale = total - active;
  const android = rows.filter((row) => row.platform === "android").length;
  const ios = rows.filter((row) => row.platform === "ios").length;
  const unknown = rows.filter((row) => row.platform === "unknown").length;
  return {
    total,
    active,
    stale,
    activePercent: pct(active, total),
    android,
    ios,
    unknown,
    androidPercent: pct(android, total),
    iosPercent: pct(ios, total),
    unknownPercent: pct(unknown, total),
  };
}

function buildAnalytics(rows: DeviceRow[], stats: DeviceStats): DeviceAnalytics {
  const today = startOfToday().getTime();
  return {
    healthSplit: [
      { label: "Active", value: stats.active, color: "var(--chart-green)" },
      { label: "Stale", value: stats.stale, color: "var(--bright-red)" },
    ],
    platformSplit: {
      android: stats.android,
      ios: stats.ios,
      unknown: stats.unknown,
      androidPercent: stats.androidPercent,
      iosPercent: stats.iosPercent,
      unknownPercent: stats.unknownPercent,
    },
    activity: {
      registeredToday: rows.filter((row) => +new Date(row.createdAt) >= today).length,
      refreshedToday: rows.filter((row) => +new Date(row.lastSeenAt) >= today).length,
    },
  };
}

async function loadDeviceRows() {
  await connectDB();
  const users = await User.find({ "fcmTokens.0": { $exists: true } }).lean<UserLean[]>();
  return flattenDevices(users);
}

export async function listDevicesAdmin(filters: DeviceFilters = {}): Promise<DeviceListResponse> {
  const all = applyFilters(await loadDeviceRows(), filters);
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
  const start = (page - 1) * limit;
  const items = all.slice(start, start + limit);
  const totalPages = Math.max(1, Math.ceil(all.length / limit));
  return {
    items,
    pagination: {
      page,
      limit,
      total: all.length,
      totalPages,
      nextCursor: page < totalPages ? page + 1 : null,
    },
  };
}

export async function getDevicesSummaryAdmin(): Promise<DeviceSummaryResponse> {
  const rows = await loadDeviceRows();
  const stats = buildStats(rows);
  return {
    stats,
    analytics: buildAnalytics(rows, stats),
    computedAt: new Date().toISOString(),
  };
}

export async function deleteDeviceAdmin(id: string): Promise<boolean> {
  const decoded = decodeDeviceId(id);
  if (!decoded) return false;
  await connectDB();
  const result = await User.updateOne(
    { userId: decoded.userId, fcmTokens: decoded.token },
    { $pull: { fcmTokens: decoded.token, deviceMeta: { token: decoded.token } } },
  );
  return result.modifiedCount > 0;
}
