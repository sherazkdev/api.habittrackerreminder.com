import { apiError, apiOk } from "@/lib/api-response";
import { clearRefreshCookie, readRefreshCookie, refreshAdminSession, setRefreshCookie } from "@/lib/auth/service";
import { encodeRefreshCookieValue } from "@/lib/auth/refresh-sessions";

export async function POST() {
  try {
    const cookie = await readRefreshCookie();
    const result = await refreshAdminSession(cookie);
    if (!result) {
      const response = apiError("SESSION_EXPIRED", "Refresh session is invalid or expired", 401);
      clearRefreshCookie(response);
      return response;
    }
    const response = apiOk({
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      tokenType: result.tokenType,
      admin: result.admin,
    });
    setRefreshCookie(response, encodeRefreshCookieValue(result.sessionId, result.refreshToken));
    return response;
  } catch (error) {
    return apiError("SERVER_ERROR", error instanceof Error ? error.message : "Refresh failed", 500);
  }
}
