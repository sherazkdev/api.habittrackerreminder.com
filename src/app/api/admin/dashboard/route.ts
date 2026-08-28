import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api-response";
import { requireAdminOrApiKey } from "@/lib/auth/service";
import { emptyDashboard, getDashboardAnalyticsCached } from "@/lib/dashboard-analytics";

const PRIVATE = { headers: { "Cache-Control": "private, no-store" } };

export async function GET(request: NextRequest) {
  const admin = await requireAdminOrApiKey(request);
  if (!admin) return apiError("UNAUTHORIZED", "Authentication required", 401);

  try {
    return apiOk(await getDashboardAnalyticsCached(), PRIVATE);
  } catch {
    return apiOk(emptyDashboard(true), PRIVATE);
  }
}
