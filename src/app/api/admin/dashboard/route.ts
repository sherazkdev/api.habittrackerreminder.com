import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api-response";
import { requireAdminOrApiKey } from "@/lib/auth/service";
import { getDashboardAnalytics } from "@/lib/dashboard-analytics";

export async function GET(request: NextRequest) {
  const admin = await requireAdminOrApiKey(request);
  if (!admin) return apiError("UNAUTHORIZED", "Authentication required", 401);
  return apiOk(await getDashboardAnalytics());
}
