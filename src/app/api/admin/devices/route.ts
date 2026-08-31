import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk } from "@/lib/api-response";
import { requireAdminOrApiKey } from "@/lib/auth/service";
import { listDevicesAdmin } from "@/lib/devices-service";

const querySchema = z.object({
  platform: z.enum(["android", "ios"]).optional(),
  status: z.enum(["active", "stale"]).optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export async function GET(request: NextRequest) {
  const admin = await requireAdminOrApiKey(request);
  if (!admin) return apiError("UNAUTHORIZED", "Authentication required", 401);

  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return apiError("VALIDATION_ERROR", "Invalid device filters", 400);

  return apiOk(await listDevicesAdmin(parsed.data));
}
