import { NextRequest } from "next/server";
import { apiError, apiOk } from "@/lib/api-response";
import { requireAdminOrApiKey } from "@/lib/auth/service";
import { deleteDeviceAdmin } from "@/lib/devices-service";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdminOrApiKey(request);
  if (!admin) return apiError("UNAUTHORIZED", "Authentication required", 401);

  const { id } = await context.params;
  const decoded = decodeURIComponent(id);
  const removed = await deleteDeviceAdmin(decoded);
  if (!removed) return apiError("NOT_FOUND", "Device token not found", 404);
  return apiOk({ message: "Device removed", id: decoded });
}
