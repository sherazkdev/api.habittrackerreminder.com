import { NotificationDelivery } from "@/models/NotificationDelivery";
import { connectDB } from "@/lib/db";

/** Prevents duplicate pushes when cron ticks multiple times in the same clock minute. */
export async function wasReminderDeliveredRecently(
  userId: string,
  habitId: string,
  scheduledTime: string,
  /** Cover a full minute of sub-minute cron ticks with buffer. */
  windowMs = 120_000,
): Promise<boolean> {
  await connectDB();
  const since = new Date(Date.now() - windowMs);
  const existing = await NotificationDelivery.findOne({
    userId,
    habitId,
    scheduledTime,
    status: { $in: ["delivered", "partial"] },
    createdAt: { $gte: since },
  })
    .select({ _id: 1 })
    .lean();
  return Boolean(existing);
}
