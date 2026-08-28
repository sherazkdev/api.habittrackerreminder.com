import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api-response";
import { requireCron } from "@/lib/auth/service";
import { dispatchDueReminders } from "@/lib/reminders";
import { env } from "@/lib/env";

export async function GET(request: NextRequest) {
  if (!env.cronSecret()) {
    return apiError("CRON_NOT_CONFIGURED", "CRON_SECRET is not configured", 503);
  }
  if (!requireCron(request)) {
    return apiError("UNAUTHORIZED", "Valid cron secret required", 401);
  }
  const result = await dispatchDueReminders();
  return apiOk(result);
}
