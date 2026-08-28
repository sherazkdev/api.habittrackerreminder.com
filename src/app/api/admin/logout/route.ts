import { apiOk } from "@/lib/api-response";
import { clearRefreshCookie, logoutAdmin, readRefreshCookie } from "@/lib/auth/service";

export async function POST() {
  const cookie = await readRefreshCookie();
  await logoutAdmin(cookie);
  const response = apiOk({ loggedOut: true });
  clearRefreshCookie(response);
  return response;
}
