import type { NextRequest } from "next/server";
import { apiError } from "@/lib/api-response";
import { getApiKeyHeader } from "@/lib/auth/service";
import { env } from "@/lib/env";
import { checkRateLimit } from "@/lib/rate-limit";

export type MobileRateLimitScope = "devices" | "reminders";

export function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

function limitForScope(scope: MobileRateLimitScope): number {
  return scope === "devices" ? env.mobileRateLimitDevicesPerWindow() : env.mobileRateLimitRemindersPerWindow();
}

export function enforceMobileRateLimit(request: NextRequest, scope: MobileRateLimitScope) {
  if (!env.mobileRateLimitEnabled()) return null;

  const ip = clientIp(request);
  const apiKey = getApiKeyHeader(request) ?? "no-key";
  const key = `${scope}:${ip}:${apiKey.slice(0, 24)}`;
  const result = checkRateLimit(key, limitForScope(scope), env.mobileRateLimitWindowMs());

  if (result.allowed) return null;

  return apiError("RATE_LIMITED", "Too many requests. Try again later.", 429, result.retryAfterSec);
}
