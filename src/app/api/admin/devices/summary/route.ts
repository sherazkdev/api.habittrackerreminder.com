import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api-response";
import { requireAdminOrApiKey } from "@/lib/auth/service";
import { getDevicesSummaryAdmin } from "@/lib/devices-service";

export async function GET(request: NextRequest) {
  const admin = await requireAdminOrApiKey(request);
  if (!admin) return apiError("UNAUTHORIZED", "Authentication required", 401);
  return apiOk(await getDevicesSummaryAdmin());
}
