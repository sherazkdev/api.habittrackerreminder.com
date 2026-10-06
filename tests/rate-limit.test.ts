import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { resetRateLimitBuckets } from "@/lib/rate-limit";
import { enforceMobileRateLimit } from "@/lib/mobile-rate-limit";

describe("enforceMobileRateLimit", () => {
  beforeEach(() => {
    resetRateLimitBuckets();
    process.env.MOBILE_RATE_LIMIT_ENABLED = "true";
    process.env.MOBILE_RATE_LIMIT_WINDOW_MS = "60000";
    process.env.MOBILE_RATE_LIMIT_DEVICES_PER_MIN = "2";
  });

  it("returns 429 after the configured limit", async () => {
    const request = new NextRequest("http://localhost/api/v1/devices", {
      headers: {
        "x-api-key": "htk_test_limit",
        "x-forwarded-for": "203.0.113.10",
      },
    });

    expect(enforceMobileRateLimit(request, "devices")).toBeNull();
    expect(enforceMobileRateLimit(request, "devices")).toBeNull();

    const blocked = enforceMobileRateLimit(request, "devices");
    expect(blocked?.status).toBe(429);
    const body = await blocked!.json();
    expect(body.error.code).toBe("RATE_LIMITED");
    expect(blocked!.headers.get("Retry-After")).toBeTruthy();
  });
});
