import { Reminder } from "@/models/Reminder";
import { User } from "@/models/User";
import { NotificationDelivery } from "@/models/NotificationDelivery";
import { connectDB } from "@/lib/db";
import { findUserByExactFcmToken } from "@/lib/device-registry";

export type PurgeDeviceDataResult = {
  ok: true;
  userId: string;
  deletedReminders: number;
  deletedDeliveries: number;
  deletedUser: boolean;
  alreadyDeleted: boolean;
};

export async function purgeDeviceDataByFcmToken(fcmToken: string): Promise<PurgeDeviceDataResult> {
  await connectDB();
  const user = await findUserByExactFcmToken(fcmToken);
  if (!user) {
    return {
      ok: true,
      userId: "",
      deletedReminders: 0,
      deletedDeliveries: 0,
      deletedUser: false,
      alreadyDeleted: true,
    };
  }

  const userId = user.userId;
  const reminders = await Reminder.deleteMany({ userId });
  const deliveries = await NotificationDelivery.deleteMany({ userId });
  const userDelete = await User.deleteOne({ userId });

  return {
    ok: true,
    userId,
    deletedReminders: reminders.deletedCount,
    deletedDeliveries: deliveries.deletedCount,
    deletedUser: userDelete.deletedCount > 0,
    alreadyDeleted: false,
  };
}
