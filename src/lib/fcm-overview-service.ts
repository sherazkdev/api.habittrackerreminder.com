import { connectDB } from "@/lib/db";
import { env, isFirebaseConfigured } from "@/lib/env";
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

export async function getFcmOverview() {
  await connectDB();
  const todayStart = startOfToday();
  const chartStart = startOfDaysAgo(6);
  const firebaseConfigured = isFirebaseConfigured();

  const [users, activeReminders, todayDeliveries, chartDocs, recentDeliveries, recentUsers] =
    await Promise.all([
      User.find({}).lean(),
      Reminder.countDocuments({}),
      NotificationDelivery.find({ createdAt: { $gte: todayStart } }).lean(),
      NotificationDelivery.aggregate<{ _id: string; delivered: number; failed: number }>([
        { $match: { createdAt: { $gte: chartStart } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            delivered: {
              $sum: {
                $cond: [{ $in: ["$status", ["delivered", "partial"]] }, 1, 0],
              },
            },
            failed: {
              $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      NotificationDelivery.find({}).sort({ createdAt: -1 }).limit(8).lean(),
      User.find({ updatedAt: { $gte: startOfDaysAgo(1) } }).sort({ updatedAt: -1 }).limit(5).lean(),
    ]);

  const registeredDevices = users.reduce((sum, u) => sum + (u.fcmTokens?.length ?? 0), 0);
  const activeDevices = users.filter((u) => (u.fcmTokens?.length ?? 0) > 0).length;
  const sentToday = todayDeliveries.filter((d) => d.status === "delivered" || d.status === "partial").length;
  const failedToday = todayDeliveries.filter((d) => d.status === "failed").length;
  const totalToday = sentToday + failedToday;
  const deliveryRatePercent = totalToday ? Math.round((sentToday / totalToday) * 100) : 100;
  const failureRatePercent = totalToday ? Math.round((failedToday / totalToday) * 100) : 0;

  const chartMap = new Map(chartDocs.map((row) => [row._id, row]));
  const chart = Array.from({ length: 7 }, (_, index) => {
    const date = startOfDaysAgo(6 - index);
    const key = date.toISOString().slice(0, 10);
    const row = chartMap.get(key);
    return {
      date: key,
      label: formatChartLabel(key),
      delivered: row?.delivered ?? 0,
      failed: row?.failed ?? 0,
    };
  });

type FlowStatus = "connected" | "degraded" | "offline";

function nodeStatus(ok: boolean): FlowStatus {
  return ok ? "connected" : "offline";
}
  const flowOk = firebaseConfigured && registeredDevices > 0;

  return {
    stats: {
      registeredDevices,
      activeDevices,
      activeReminders,
      enabledReminderPercent: activeReminders > 0 ? 100 : 0,
      sentToday,
      failedToday,
      deliveryRatePercent,
      failureRatePercent,
    },
    flow: {
      mobileApp: "connected" as const,
      apiServer: "connected" as const,
      firebaseFcm: nodeStatus(firebaseConfigured),
      userDevice: nodeStatus(flowOk),
    },
    chart,
    recentDeliveries: recentDeliveries.map((doc, index) => ({
      id: index + 1,
      createdAt: doc.createdAt?.toISOString?.() ?? new Date().toISOString(),
      firebaseUid: doc.userId,
      reminderId: doc.habitId,
      notification: doc.habitName,
      schedule: doc.scheduledTime,
      gender: "male" as const,
      tokenCount: doc.tokenCount ?? 0,
      status: doc.status as "delivered" | "partial" | "failed" | "skipped",
    })),
    activity: [
      ...recentDeliveries.slice(0, 3).map((doc, index) => ({
        id: `delivery-${index}`,
        type: "delivery" as const,
        message: `${doc.status} • ${doc.habitName}`,
        createdAt: doc.createdAt?.toISOString?.() ?? new Date().toISOString(),
        tone: doc.status === "failed" ? ("warning" as const) : ("success" as const),
      })),
      ...recentUsers.map((user, index) => ({
        id: `device-${index}`,
        type: "device_registered" as const,
        message: `Device tokens updated (${user.fcmTokens?.length ?? 0})`,
        createdAt: user.updatedAt?.toISOString?.() ?? new Date().toISOString(),
        tone: "info" as const,
      })),
    ].slice(0, 6),
    system: {
      firebaseAdmin: nodeStatus(firebaseConfigured),
      scheduler: nodeStatus(Boolean(env.cronSecret())),
      api: "connected" as const,
      firebaseConfigured,
      schedulerEnabled: Boolean(env.cronSecret()),
    },
    computedAt: new Date().toISOString(),
  };
}

export async function getDashboardStats() {
  await connectDB();
  const todayStart = startOfToday();
  const chartStart = startOfDaysAgo(6);
  const prevStart = startOfDaysAgo(13);

  const [
    users,
    reminders,
    timerReminders,
    usersWithDevices,
    devices,
    todayDocs,
    weekDocs,
    prevWeekCount,
    statusDocs,
    recentDeliveries,
  ] = await Promise.all([
    User.countDocuments({}),
    Reminder.countDocuments({}),
    Reminder.countDocuments({ timer: true }),
    User.countDocuments({ "fcmTokens.0": { $exists: true } }),
    User.aggregate<{ total: number }>([
      { $project: { count: { $size: { $ifNull: ["$fcmTokens", []] } } } },
      { $group: { _id: null, total: { $sum: "$count" } } },
    ]),
    NotificationDelivery.find({ createdAt: { $gte: todayStart } }).lean(),
    NotificationDelivery.aggregate<{ _id: string; delivered: number; failed: number; sent: number }>([
      { $match: { createdAt: { $gte: chartStart } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          delivered: { $sum: { $cond: [{ $in: ["$status", ["delivered", "partial"]] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
          sent: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    NotificationDelivery.countDocuments({ createdAt: { $gte: prevStart, $lt: chartStart } }),
    NotificationDelivery.aggregate<{ _id: string; count: number }>([
      { $match: { createdAt: { $gte: chartStart } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    NotificationDelivery.find({}).sort({ createdAt: -1 }).limit(6).lean(),
  ]);

  const deliveredToday = todayDocs.filter((d) => d.status === "delivered" || d.status === "partial").length;
  const failedToday = todayDocs.filter((d) => d.status === "failed").length;
  const skippedToday = todayDocs.filter((d) => d.status === "skipped").length;
  const deliveriesToday = todayDocs.length;
  const deliveryRatePercent = deliveriesToday
    ? Math.round((deliveredToday / deliveriesToday) * 100)
    : 100;

  const chartMap = new Map(weekDocs.map((row) => [row._id, row]));
  const weekChart = Array.from({ length: 7 }, (_, index) => {
    const date = startOfDaysAgo(6 - index);
    const key = date.toISOString().slice(0, 10);
    const row = chartMap.get(key);
    return {
      date: key,
      label: formatChartLabel(key),
      delivered: row?.delivered ?? 0,
      failed: row?.failed ?? 0,
      sent: row?.sent ?? 0,
    };
  });

  const weekSent = weekChart.reduce((sum, row) => sum + row.sent, 0);
  const weekDelta = prevWeekCount === 0 ? (weekSent > 0 ? 100 : 0) : Math.round(((weekSent - prevWeekCount) / prevWeekCount) * 100);

  const statusMap = Object.fromEntries(statusDocs.map((row) => [row._id, row.count]));
  const statusBreakdown = [
    { label: "Delivered", value: statusMap.delivered ?? 0, color: "var(--chart-green)" },
    { label: "Partial", value: statusMap.partial ?? 0, color: "var(--chart-purple)" },
    { label: "Failed", value: statusMap.failed ?? 0, color: "var(--bright-red)" },
    { label: "Skipped", value: statusMap.skipped ?? 0, color: "var(--chart-blue)" },
  ];

  return {
    users,
    reminders,
    registeredDevices: devices[0]?.total ?? 0,
    deliveriesToday,
    deliveredToday,
    failedToday,
    skippedToday,
    deliveryRatePercent,
    usersWithDevices,
    timerReminders,
    repeatReminders: Math.max(0, reminders - timerReminders),
    weekDelta,
    weekChart,
    statusBreakdown,
    reminderModes: [
      { label: "Fixed time", value: timerReminders, color: "var(--chart-purple)" },
      { label: "Repeat interval", value: Math.max(0, reminders - timerReminders), color: "var(--chart-blue)" },
    ],
    recentDeliveries: recentDeliveries.map((doc) => ({
      id: doc._id.toString(),
      habitName: doc.habitName,
      status: doc.status,
      createdAt: doc.createdAt?.toISOString?.() ?? new Date().toISOString(),
    })),
  };
}
