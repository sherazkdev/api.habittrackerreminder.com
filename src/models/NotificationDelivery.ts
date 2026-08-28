import { Schema, model, models } from "mongoose";

const NotificationDeliverySchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    habitId: { type: String, required: true },
    habitName: { type: String, required: true },
    notificationBody: { type: String, required: true },
    scheduledTime: { type: String, required: true },
    tokenCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["delivered", "partial", "failed", "skipped"],
      required: true,
    },
  },
  { timestamps: true },
);

NotificationDeliverySchema.index({ createdAt: -1 });
NotificationDeliverySchema.index({ status: 1, createdAt: -1 });

export const NotificationDelivery =
  models.NotificationDelivery ?? model("NotificationDelivery", NotificationDeliverySchema);
