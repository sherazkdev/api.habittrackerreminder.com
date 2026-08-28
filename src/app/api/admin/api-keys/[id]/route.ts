import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth/service";
import { revokeApiKey } from "@/lib/auth/api-keys";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin(request);
  if (!admin) return apiError("UNAUTHORIZED", "Bearer token required", 401);

  const { id } = await context.params;
  const revoked = await revokeApiKey(admin._id.toString(), id);
  if (!revoked) return apiError("NOT_FOUND", "API key not found", 404);
  return apiOk({ id, revoked: true });
}
