import { apiOk } from "@/lib/api-response";
import { env } from "@/lib/env";

export async function GET() {
  return apiOk({
    status: "ok",
    name: env.appName(),
    version: env.appVersion(),
    checkedAt: new Date().toISOString(),
  });
}
