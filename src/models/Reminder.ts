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
    timezone: { type: String },
  },
  { timestamps: true },
);

ReminderSchema.index({ userId: 1, habitId: 1 }, { unique: true });
// Do NOT compound-index two array fields together (MongoDB parallel-array limit).
// That broke reminder upserts with: cannot index parallel arrays [days] [scheduledTimes]
ReminderSchema.index({ scheduledTimes: 1 });
ReminderSchema.index({ days: 1 });
ReminderSchema.index({ timezone: 1, scheduledTimes: 1 });

export const Reminder = models.Reminder ?? model("Reminder", ReminderSchema);
