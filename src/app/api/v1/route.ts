import { apiOk } from "@/lib/api-response";
import { env } from "@/lib/env";

export async function GET() {
  return apiOk({
    name: env.appName(),
    version: env.appVersion(),
    docs: {
      swagger: "/docs",
      publicSwagger: "/docs/public",
      openapi: "/api/v1/openapi.json",
    },
    auth: {
      bearer: "Authorization: Bearer <admin accessToken>",
      apiKey: "x-api-key: <htk_...>",
      fcmToken: "x-fcm-token: <CURRENT_PHONE_FCM_TOKEN> (mobile reminders)",
      cron: "Authorization: Bearer <CRON_SECRET> or x-cron-secret",
    },
    links: {
      health: "/health",
      ready: "/ready",
      admin: "/admin/login",
      reminder: "/api/v1/habits/reminder",
      reminderSpec: "/api/habits/reminder",
      devices: "/api/v1/devices",
      cron: "/api/v1/habits/cron/reminder",
      cronSpec: "/api/cron/reminders",
    },
  });
}
