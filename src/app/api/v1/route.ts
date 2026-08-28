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
      bearer: "Authorization: Bearer <accessToken | Firebase ID token>",
      apiKey: "x-api-key: <htk_...>",
      cron: "Authorization: Bearer <CRON_SECRET> or x-cron-secret",
    },
    links: {
      health: "/health",
      ready: "/ready",
      admin: "/admin/login",
      reminder: "/api/v1/habits/reminder",
      devices: "/api/v1/devices",
    },
  });
}
