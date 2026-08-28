import { connectDB } from "@/lib/db";
import { NotificationDelivery } from "@/models/NotificationDelivery";
import { Reminder } from "@/models/Reminder";
import { User } from "@/models/User";

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function startOfDaysAgo(days: number) {
  const date = startOfToday();
  date.setDate(date.getDate() - days);
  return date;
}

function formatChartLabel(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export async function getDashboardAnalytics() {
  await connectDB();
  const todayStart = startOfToday();
  const weekStart = startOfDaysAgo(6);
  const prevWeekStart = startOfDaysAgo(13);
  const prevWeekEnd = startOfDaysAgo(7);

  const [
    users,
    reminders,
    devicesAgg,
    todayDeliveries,
    weekDeliveries,
    prevWeekCount,
    chartDocs,
    hourlyDocs,
    statusDocs,
    recentDeliveries,
  ] = await Promise.all([
    User.countDocuments({}),
    Reminder.find({}).lean(),
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
    ]),
    NotificationDelivery.find({ createdAt: { $gte: todayStart } }).lean(),
    NotificationDelivery.countDocuments({ createdAt: { $gte: weekStart } }),
    NotificationDelivery.countDocuments({ createdAt: { $gte: prevWeekStart, $lt: prevWeekEnd } }),
    NotificationDelivery.aggregate<{ _id: string; delivered: number; failed: number; skipped: number }>([
      { $match: { createdAt: { $gte: weekStart } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          delivered: { $sum: { $cond: [{ $in: ["$status", ["delivered", "partial"]] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
          skipped: { $sum: { $cond: [{ $eq: ["$status", "skipped"] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    NotificationDelivery.aggregate<{ _id: number; count: number }>([
      { $match: { createdAt: { $gte: todayStart } } },
      { $group: { _id: { $hour: "$createdAt" }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    NotificationDelivery.aggregate<{ _id: string; count: number }>([
      { $match: { createdAt: { $gte: weekStart } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    NotificationDelivery.find({}).sort({ createdAt: -1 }).limit(6).lean(),
  ]);

  const registeredDevices = devicesAgg[0]?.total ?? 0;
  const usersWithDevices = devicesAgg[0]?.withTokens ?? 0;
  const sentToday = todayDeliveries.filter((d) => d.status === "delivered" || d.status === "partial").length;
  const failedToday = todayDeliveries.filter((d) => d.status === "failed").length;
  const skippedToday = todayDeliveries.filter((d) => d.status === "skipped").length;
  const totalToday = sentToday + failedToday;
  const deliveryRate = totalToday ? Math.round((sentToday / totalToday) * 100) : 100;
  const weekDelta = prevWeekCount === 0 ? (weekDeliveries > 0 ? 100 : 0) : Math.round(((weekDeliveries - prevWeekCount) / prevWeekCount) * 100);

  const chartMap = new Map(chartDocs.map((row) => [row._id, row]));
  const weekChart = Array.from({ length: 7 }, (_, index) => {
    const date = startOfDaysAgo(6 - index);
    const key = date.toISOString().slice(0, 10);
    const row = chartMap.get(key);
    const delivered = row?.delivered ?? 0;
    const failed = row?.failed ?? 0;
    return {
      date: key,
      label: formatChartLabel(key),
      delivered,
      failed,
      skipped: row?.skipped ?? 0,
      sent: delivered + failed,
    };
  });

  const hourlyMap = new Map(hourlyDocs.map((row) => [row._id, row.count]));
  const hourly = Array.from({ length: 24 }, (_, hour) => ({
    label: `${String(hour).padStart(2, "0")}:00`,
    count: hourlyMap.get(hour) ?? 0,
  }));

  const timerCount = reminders.filter((item) => item.timer).length;
  const repeatCount = reminders.filter((item) => item.repeat).length;

  const dayCounts: Record<string, number> = {
    Everyday: 0,
    Monday: 0,
    Tuesday: 0,
    Wednesday: 0,
    Thursday: 0,
    Friday: 0,
    Saturday: 0,
    Sunday: 0,
  };
  for (const reminder of reminders) {
    for (const day of reminder.days ?? []) {
      if (day in dayCounts) dayCounts[day] += 1;
    }
  }

  const statusMap = Object.fromEntries(statusDocs.map((row) => [row._id, row.count]));

  return {
    users,
    reminders: reminders.length,
    registeredDevices,
    deliveriesToday: todayDeliveries.length,
    sentToday,
    deliveredToday: sentToday,
    failedToday,
    skippedToday,
    deliveryRate,
    deliveryRatePercent: deliveryRate,
    usersWithDevices,
    usersWithoutDevices: Math.max(0, users - usersWithDevices),
    timerReminders: timerCount,
    repeatReminders: repeatCount,
    weekDeliveries,
    weekDelta,
    weekChart,
    hourly,
    reminderModes: [
      { label: "Fixed time", value: timerCount, color: "var(--chart-purple)" },
      { label: "Repeat interval", value: repeatCount, color: "var(--chart-blue)" },
    ],
    weekdayBars: Object.entries(dayCounts).map(([label, value]) => ({ label, value })),
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
  };
}
