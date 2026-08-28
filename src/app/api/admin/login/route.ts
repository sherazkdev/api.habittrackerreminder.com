import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, apiOk } from "@/lib/api-response";
import {
  ensureAdminSeed,
  loginAdmin,
  setRefreshCookie,
} from "@/lib/auth/service";
import { encodeRefreshCookieValue } from "@/lib/auth/refresh-sessions";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    await ensureAdminSeed();
    const parsed = loginSchema.safeParse(await request.json());
    if (!parsed.success) {
      return apiError("VALIDATION_ERROR", "Email and password are required", 400);
    }
    const result = await loginAdmin(parsed.data.email, parsed.data.password);
    if (!result) {
      return apiError("INVALID_CREDENTIALS", "Invalid email or password", 401);
    }
    const response = apiOk({
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      tokenType: result.tokenType,
      admin: result.admin,
    });
    setRefreshCookie(
      response,
      encodeRefreshCookieValue(result.sessionId, result.refreshToken),
    );
    return response;
  } catch (error) {
    return apiError("SERVER_ERROR", error instanceof Error ? error.message : "Login failed", 500);
  }
}

