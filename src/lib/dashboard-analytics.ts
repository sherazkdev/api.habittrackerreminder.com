import { connectDB } from "@/lib/db";
import { env } from "@/lib/env";
import { NotificationDelivery } from "@/models/NotificationDelivery";
import { Reminder } from "@/models/Reminder";
import { User } from "@/models/User";

const QUERY_MS = 6_000;
const CACHE_TTL_MS = 15_000;
const STALE_TTL_MS = 10 * 60_000;
const WEEKDAYS = ["Everyday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

export type DashboardAnalytics = {
  users: number;
  reminders: number;
  registeredDevices: number;
  deliveriesToday: number;
  sentToday: number;
  deliveredToday: number;
  failedToday: number;
  skippedToday: number;
  deliveryRate: number;
  deliveryRatePercent: number;
  usersWithDevices: number;
  usersWithoutDevices: number;
  timerReminders: number;
  repeatReminders: number;
  weekDeliveries: number;
  weekDelta: number;
  weekChart: Array<{ date: string; label: string; delivered: number; failed: number; skipped: number; sent: number }>;
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
  stale: boolean;
  cached: boolean;
  generatedAt: string;
};

type CacheEntry = { data: DashboardAnalytics; at: number };

declare global {
  // eslint-disable-next-line no-var
  var dashboardAnalyticsCache: CacheEntry | null | undefined;
  // eslint-disable-next-line no-var
  var dashboardAnalyticsInflight: Promise<DashboardAnalytics> | null | undefined;
}

function cacheEntry() {
  return global.dashboardAnalyticsCache ?? null;
}

function setCache(entry: CacheEntry | null) {
  global.dashboardAnalyticsCache = entry;
}

export function deliveryRatePercent(sentToday: number, failedToday: number) {
  const total = sentToday + failedToday;
  return total ? Math.round((sentToday / total) * 100) : 100;
}

export function dateKeyInZone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function shiftDateKey(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

export function zonedMidnight(timeZone: string, dateKey: string) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [year, month, day] = dateKey.split("-").map(Number);
  let low = Date.UTC(year, month - 1, day - 1);
  let high = Date.UTC(year, month - 1, day + 1);
  while (high - low > 500) {
    const mid = Math.floor((low + high) / 2);
    if (fmt.format(new Date(mid)) >= dateKey) high = mid;
    else low = mid;
  }
  return new Date(high);
}

function formatChartLabel(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("DASHBOARD_TIMEOUT")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function statusCount(rows: Array<{ _id: string; count: number }>, status: string) {
  return rows.find((row) => row._id === status)?.count ?? 0;
}

export function emptyDashboard(stale = true): DashboardAnalytics {
  const timeZone = env.reminderTimezone();
  const todayKey = dateKeyInZone(new Date(), timeZone);
  const weekChart = Array.from({ length: 7 }, (_, index) => {
    const date = shiftDateKey(todayKey, index - 6);
    return { date, label: formatChartLabel(date), delivered: 0, failed: 0, skipped: 0, sent: 0 };
  });
  return {
    users: 0,
    reminders: 0,
    registeredDevices: 0,
    deliveriesToday: 0,
    sentToday: 0,
    deliveredToday: 0,
    failedToday: 0,
    skippedToday: 0,
    deliveryRate: 100,
    deliveryRatePercent: 100,
    usersWithDevices: 0,
    usersWithoutDevices: 0,
    timerReminders: 0,
    repeatReminders: 0,
    weekDeliveries: 0,
    weekDelta: 0,
    weekChart,
    hourly: Array.from({ length: 24 }, (_, hour) => ({
      label: `${String(hour).padStart(2, "0")}:00`,
      count: 0,
    })),
    reminderModes: [
      { label: "Fixed time", value: 0, color: "var(--chart-purple)" },
      { label: "Repeat interval", value: 0, color: "var(--chart-blue)" },
    ],
    weekdayBars: WEEKDAYS.map((label) => ({ label, value: 0 })),
    statusBreakdown: [
      { label: "Delivered", value: 0, color: "var(--chart-green)" },
      { label: "Partial", value: 0, color: "var(--chart-orange)" },
      { label: "Failed", value: 0, color: "var(--bright-red)" },
      { label: "Skipped", value: 0, color: "var(--chart-blue)" },
    ],
    recentDeliveries: [],
    stale,
    cached: false,
    generatedAt: new Date().toISOString(),
  };
}

export async function getDashboardAnalytics(): Promise<DashboardAnalytics> {
  await connectDB();
  const timeZone = env.reminderTimezone();
  const todayKey = dateKeyInZone(new Date(), timeZone);
  const todayStart = zonedMidnight(timeZone, todayKey);
  const weekStart = zonedMidnight(timeZone, shiftDateKey(todayKey, -6));
  const prevWeekStart = zonedMidnight(timeZone, shiftDateKey(todayKey, -13));
  const prevWeekEnd = zonedMidnight(timeZone, shiftDateKey(todayKey, -7));
  const queryOptions = { maxTimeMS: 4_000 };

  const [users, devicesAgg, reminderFacet, deliveryFacet, recentDeliveries] = await Promise.all([
    User.countDocuments({}, queryOptions),
    User.aggregate<{ total: number; withTokens: number }>([
      {
        $group: {
          _id: null,
          total: { $sum: { $size: { $ifNull: ["$fcmTokens", []] } } },
          withTokens: {
            $sum: { $cond: [{ $gt: [{ $size: { $ifNull: ["$fcmTokens", []] } }, 0] }, 1, 0] },
          },
        },
      },
    ]).option(queryOptions),
    Reminder.aggregate<{
      total: Array<{ n: number }>;
      modes: Array<{ timer: number; repeat: number }>;
      days: Array<{ _id: string; value: number }>;
    }>([
      {
        $facet: {
          total: [{ $count: "n" }],
          modes: [
            {
              $group: {
                _id: null,
                timer: { $sum: { $cond: ["$timer", 1, 0] } },
                repeat: { $sum: { $cond: ["$repeat", 1, 0] } },
              },
            },
          ],
          days: [{ $unwind: { path: "$days", preserveNullAndEmptyArrays: false } }, { $group: { _id: "$days", value: { $sum: 1 } } }],
        },
      },
    ]).option(queryOptions),
    NotificationDelivery.aggregate<{
      weekChart: Array<{ _id: string; delivered: number; failed: number; skipped: number }>;
      weekStatus: Array<{ _id: string; count: number }>;
      todayStatus: Array<{ _id: string; count: number }>;
      hourly: Array<{ _id: number; count: number }>;
      weekCount: Array<{ n: number }>;
      prevWeekCount: Array<{ n: number }>;
    }>([
      { $match: { createdAt: { $gte: prevWeekStart } } },
      {
        $facet: {
          weekChart: [
            { $match: { createdAt: { $gte: weekStart } } },
            {
              $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: timeZone } },
                delivered: { $sum: { $cond: [{ $in: ["$status", ["delivered", "partial"]] }, 1, 0] } },
                failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
                skipped: { $sum: { $cond: [{ $eq: ["$status", "skipped"] }, 1, 0] } },
              },
            },
          ],
          weekStatus: [
            { $match: { createdAt: { $gte: weekStart } } },
            { $group: { _id: "$status", count: { $sum: 1 } } },
          ],
          todayStatus: [
            { $match: { createdAt: { $gte: todayStart } } },
            { $group: { _id: "$status", count: { $sum: 1 } } },
          ],
          hourly: [
            { $match: { createdAt: { $gte: todayStart } } },
            { $group: { _id: { $hour: { date: "$createdAt", timezone: timeZone } }, count: { $sum: 1 } } },
          ],
          weekCount: [{ $match: { createdAt: { $gte: weekStart } } }, { $count: "n" }],
          prevWeekCount: [
            { $match: { createdAt: { $gte: prevWeekStart, $lt: prevWeekEnd } } },
            { $count: "n" },
          ],
        },
      },
    ]).option(queryOptions),
    NotificationDelivery.find({}, { habitName: 1, status: 1, createdAt: 1, tokenCount: 1 })
      .sort({ createdAt: -1 })
      .limit(6)
      .maxTimeMS(4_000)
      .lean(),
  ]);

  const reminderRow = reminderFacet[0];
  const deliveryRow = deliveryFacet[0];
  const timerCount = reminderRow?.modes[0]?.timer ?? 0;
  const repeatCount = reminderRow?.modes[0]?.repeat ?? 0;
  const reminderTotal = reminderRow?.total[0]?.n ?? 0;
  const dayMap = Object.fromEntries((reminderRow?.days ?? []).map((row) => [row._id, row.value]));

  const todayStatus = deliveryRow?.todayStatus ?? [];
  const sentToday = statusCount(todayStatus, "delivered") + statusCount(todayStatus, "partial");
  const failedToday = statusCount(todayStatus, "failed");
  const skippedToday = statusCount(todayStatus, "skipped");
  const deliveriesToday = sentToday + failedToday + skippedToday;
  const rate = deliveryRatePercent(sentToday, failedToday);

  const weekDeliveries = deliveryRow?.weekCount[0]?.n ?? 0;
  const prevWeekCount = deliveryRow?.prevWeekCount[0]?.n ?? 0;
  const weekDelta =
    prevWeekCount === 0 ? (weekDeliveries > 0 ? 100 : 0) : Math.round(((weekDeliveries - prevWeekCount) / prevWeekCount) * 100);

  const chartMap = new Map((deliveryRow?.weekChart ?? []).map((row) => [row._id, row]));
  const weekChart = Array.from({ length: 7 }, (_, index) => {
    const date = shiftDateKey(todayKey, index - 6);
    const row = chartMap.get(date);
    const delivered = row?.delivered ?? 0;
    const failed = row?.failed ?? 0;
    return {
      date,
      label: formatChartLabel(date),
      delivered,
      failed,
      skipped: row?.skipped ?? 0,
      sent: delivered + failed,
    };
  });

  const hourlyMap = new Map((deliveryRow?.hourly ?? []).map((row) => [row._id, row.count]));
  const statusMap = Object.fromEntries((deliveryRow?.weekStatus ?? []).map((row) => [row._id, row.count]));
  const registeredDevices = devicesAgg[0]?.total ?? 0;
  const usersWithDevices = devicesAgg[0]?.withTokens ?? 0;

  return {
    users,
    reminders: reminderTotal,
    registeredDevices,
    deliveriesToday,
    sentToday,
    deliveredToday: sentToday,
    failedToday,
    skippedToday,
    deliveryRate: rate,
    deliveryRatePercent: rate,
    usersWithDevices,
    usersWithoutDevices: Math.max(0, users - usersWithDevices),
    timerReminders: timerCount,
    repeatReminders: repeatCount,
    weekDeliveries,
    weekDelta,
    weekChart,
    hourly: Array.from({ length: 24 }, (_, hour) => ({
      label: `${String(hour).padStart(2, "0")}:00`,
      count: hourlyMap.get(hour) ?? 0,
    })),
    reminderModes: [
      { label: "Fixed time", value: timerCount, color: "var(--chart-purple)" },
      { label: "Repeat interval", value: repeatCount, color: "var(--chart-blue)" },
    ],
    weekdayBars: WEEKDAYS.map((label) => ({ label, value: dayMap[label] ?? 0 })),
    statusBreakdown: [
      { label: "Delivered", value: statusMap.delivered ?? 0, color: "var(--chart-green)" },
      { label: "Partial", value: statusMap.partial ?? 0, color: "var(--chart-orange)" },
      { label: "Failed", value: statusMap.failed ?? 0, color: "var(--bright-red)" },
      { label: "Skipped", value: statusMap.skipped ?? 0, color: "var(--chart-blue)" },
    ],
    recentDeliveries: recentDeliveries.map((doc) => ({
      id: String(doc._id),
      habitName: doc.habitName,
      status: doc.status,
      createdAt: doc.createdAt?.toISOString?.() ?? new Date().toISOString(),
      tokenCount: doc.tokenCount ?? 0,
    })),
    stale: false,
    cached: false,
    generatedAt: new Date().toISOString(),
  };
}

export async function getDashboardAnalyticsCached(): Promise<DashboardAnalytics> {
  const existing = cacheEntry();
  if (existing && Date.now() - existing.at < CACHE_TTL_MS) {
    return { ...existing.data, cached: true, stale: false };
  }

  if (!global.dashboardAnalyticsInflight) {
    global.dashboardAnalyticsInflight = withTimeout(getDashboardAnalytics(), QUERY_MS)
      .then((data) => {
        setCache({ data, at: Date.now() });
        return data;
      })
      .finally(() => {
        global.dashboardAnalyticsInflight = null;
      });
  }

  try {
    return await global.dashboardAnalyticsInflight;
  } catch (error) {
    if (existing && Date.now() - existing.at < STALE_TTL_MS) {
      return { ...existing.data, stale: true, cached: true };
    }
    throw error;
  }
}
