import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth/service";
import { createApiKey, listApiKeys } from "@/lib/auth/api-keys";

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return apiError("UNAUTHORIZED", "Bearer token required", 401);
  return apiOk({ items: await listApiKeys(admin._id.toString()) });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return apiError("UNAUTHORIZED", "Bearer token required", 401);

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("VALIDATION_ERROR", "A key name is required", 400);

  const result = await createApiKey(admin._id.toString(), parsed.data.name);
  if (!result.ok) return apiError("VALIDATION_ERROR", result.message, 400);
  return apiOk(result.key, { status: 201 });
}
