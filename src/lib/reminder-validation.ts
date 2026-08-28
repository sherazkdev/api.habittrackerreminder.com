import { z } from "zod";
import { isValidTime, timeToMinutes } from "@/lib/schedule";

export const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export const DAY_OPTIONS = [...WEEKDAYS, "Everyday"] as const;

const timeSchema = z.string().refine(isValidTime, "Time must be HH:mm in 24-hour format");

export const reminderPayloadSchema = z
  .object({
    habitId: z.string().trim().min(1),
    habitName: z.string().trim().min(1),
    notificationBody: z.string().trim().min(1),
    days: z.array(z.enum(DAY_OPTIONS)).min(1),
    timer: z.boolean(),
    repeat: z.boolean(),
    time: timeSchema.optional(),
    startTime: timeSchema.optional(),
    endTime: timeSchema.optional(),
    repeatCount: z.number().int().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.timer === value.repeat) {
      ctx.addIssue({
        code: "custom",
        message: "Exactly one of timer or repeat must be true",
        path: ["timer"],
      });
    }
    if (value.timer && !value.time) {
      ctx.addIssue({ code: "custom", message: "time is required when timer is true", path: ["time"] });
    }
    if (value.repeat) {
      if (!value.startTime) {
        ctx.addIssue({ code: "custom", message: "startTime is required when repeat is true", path: ["startTime"] });
      }
      if (!value.endTime) {
        ctx.addIssue({ code: "custom", message: "endTime is required when repeat is true", path: ["endTime"] });
      }
      if (!value.repeatCount) {
        ctx.addIssue({ code: "custom", message: "repeatCount is required when repeat is true", path: ["repeatCount"] });
      }
      if (value.startTime && value.endTime && timeToMinutes(value.startTime) >= timeToMinutes(value.endTime)) {
        ctx.addIssue({ code: "custom", message: "startTime must be earlier than endTime", path: ["startTime"] });
      }
    }
  });

export type ReminderPayload = z.infer<typeof reminderPayloadSchema>;
