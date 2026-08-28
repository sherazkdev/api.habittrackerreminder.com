const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidTime(value: string): boolean {
  return TIME_RE.test(value);
}

export function timeToMinutes(value: string): number {
  const match = TIME_RE.exec(value);
  if (!match) return -1;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function minutesToTime(total: number): string {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function computeScheduledTimes(input: {
  timer: boolean;
  repeat: boolean;
  time?: string;
  startTime?: string;
  endTime?: string;
  repeatCount?: number;
}): string[] {
  if (input.timer && input.time) return [input.time];
  const start = input.startTime ?? "00:00";
  const count = input.repeatCount ?? 1;
  if (count <= 1) return [start];
  const startMins = timeToMinutes(start);
  const endMins = timeToMinutes(input.endTime ?? start);
  const gap = (endMins - startMins) / (count - 1);
  return Array.from({ length: count }, (_, index) => minutesToTime(Math.round(startMins + gap * index)));
}

export function weekdayName(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone }).format(date);
}

export function isReminderDue(
  reminder: { scheduledTimes: string[]; days: string[] },
  clock: { day: string; time: string },
): boolean {
  if (!reminder.scheduledTimes.includes(clock.time)) return false;
  return reminder.days.includes("Everyday") || reminder.days.includes(clock.day);
}

export function dueReminderFilter(clock: { day: string; time: string }) {
  return {
    scheduledTimes: clock.time,
    $or: [{ days: "Everyday" }, { days: clock.day }],
  };
}

export function currentClock(timeZone: string): { day: string; time: string } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const day = parts.find((part) => part.type === "weekday")?.value ?? weekdayName(now, timeZone);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return { day, time: `${hour}:${minute}` };
}
