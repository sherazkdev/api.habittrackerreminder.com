import { Schema, model, models } from "mongoose";

const ReminderSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    habitId: { type: String, required: true },
    habitName: { type: String, required: true },
    notificationBody: { type: String, required: true },
    days: [{ type: String, required: true }],
    timer: { type: Boolean, required: true },
    repeat: { type: Boolean, required: true },
    time: String,
    startTime: String,
    endTime: String,
    repeatCount: Number,
    scheduledTimes: [{ type: String, required: true }],
  },
  { timestamps: true },
);

ReminderSchema.index({ userId: 1, habitId: 1 }, { unique: true });
ReminderSchema.index({ scheduledTimes: 1, days: 1 });

export const Reminder = models.Reminder ?? model("Reminder", ReminderSchema);
