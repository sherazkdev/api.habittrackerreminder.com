import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk } from "@/lib/api-response";
import { changeAdminPassword, clearRefreshCookie, requireAdmin } from "@/lib/auth/service";
import { passwordMeetsPolicy, passwordPolicyMessage } from "@/lib/auth/password-policy";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(1),
  confirmPassword: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return apiError("UNAUTHORIZED", "Authentication required", 401);

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Current password, new password, and confirmation are required", 400);
  }
  if (!passwordMeetsPolicy(parsed.data.newPassword)) {
    return apiError("VALIDATION_ERROR", passwordPolicyMessage(), 400);
  }

  const result = await changeAdminPassword(
    admin._id.toString(),
    parsed.data.currentPassword,
    parsed.data.newPassword,
    parsed.data.confirmPassword,
  );

  if (!result.ok) {
    const status = result.code === "INVALID_CREDENTIALS" ? 401 : 400;
    return apiError(result.code, result.message, status);
  }

  const response = apiOk({ passwordChanged: true, requiresLogin: true });
  clearRefreshCookie(response);
  return response;
}
