import { apiPost } from "@/lib/api-client";

export async function changePassword(payload: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) {
  return apiPost<{ passwordChanged: true; requiresLogin: true }>(
    "/api/admin/change-password",
    payload,
  );
}

export async function logout() {
  return apiPost<{ loggedOut: true }>("/api/admin/logout", {}, { auth: false });
}
