export type EndpointRow = {
  method: string;
  path: string;
  desc: string;
  auth?: "none" | "public" | "bearer" | "bearer-or-key" | "bearer-only" | "api-key" | "api-key-and-fcm" | "cron";
  group: string;
};

export const PUBLIC_ENDPOINTS: EndpointRow[] = [
  { method: "GET", path: "/health", desc: "Liveness probe", auth: "none", group: "Platform" },
  { method: "GET", path: "/ready", desc: "Mongo + Firebase readiness", auth: "none", group: "Platform" },
  { method: "GET", path: "/api/v1/", desc: "API discovery", auth: "none", group: "Public v1" },
  { method: "GET", path: "/api/v1/openapi.json", desc: "OpenAPI 3.0 spec", auth: "none", group: "Public v1" },
  { method: "GET", path: "/docs", desc: "Admin Swagger UI (Bearer + x-api-key)", auth: "none", group: "Platform" },
  { method: "GET", path: "/docs/public", desc: "Public / mobile Swagger UI", auth: "none", group: "Platform" },
];

export const MOBILE_ENDPOINTS: EndpointRow[] = [
  { method: "POST", path: "/api/v1/habits/reminder", desc: "Save one habit schedule. x-api-key + x-fcm-token. Cron sends the push at the due time.", auth: "api-key-and-fcm", group: "Mobile v1" },
  { method: "DELETE", path: "/api/v1/habits/reminder/:habitId", desc: "Delete a habit reminder. x-api-key + x-fcm-token.", auth: "api-key-and-fcm", group: "Mobile v1" },
  { method: "POST", path: "/api/v1/habits/reminder/bulk", desc: "Bulk upsert reminders. x-api-key + x-fcm-token.", auth: "api-key-and-fcm", group: "Mobile v1" },
  { method: "POST", path: "/api/v1/devices", desc: "Register or refresh FCM token. x-api-key + { fcmToken }. Does not send a notification.", auth: "api-key", group: "Mobile v1" },
  { method: "DELETE", path: "/api/v1/devices", desc: "Unregister FCM token. x-api-key + { fcmToken }", auth: "api-key", group: "Mobile v1" },
  { method: "GET", path: "/api/v1/habits/cron/reminder", desc: "Dispatch due reminders this minute", auth: "cron", group: "Cron" },
];

export const ADMIN_AUTH_ENDPOINTS: EndpointRow[] = [
  { method: "POST", path: "/api/admin/login", desc: "Email/password → Bearer accessToken", auth: "none", group: "Admin auth" },
  { method: "POST", path: "/api/admin/refresh", desc: "Refresh cookie → new accessToken", auth: "none", group: "Admin auth" },
  { method: "POST", path: "/api/admin/logout", desc: "Revoke refresh session", auth: "none", group: "Admin auth" },
  { method: "POST", path: "/api/admin/change-password", desc: "Change password (Bearer only)", auth: "bearer-only", group: "Admin auth" },
];

export const ADMIN_API_KEY_ENDPOINTS: EndpointRow[] = [
  { method: "GET", path: "/api/admin/api-keys", desc: "List your API keys (masked)", auth: "bearer-only", group: "API keys" },
  { method: "POST", path: "/api/admin/api-keys", desc: "Create x-api-key (shown once)", auth: "bearer-only", group: "API keys" },
  { method: "DELETE", path: "/api/admin/api-keys/:id", desc: "Revoke API key", auth: "bearer-only", group: "API keys" },
];

export const ADMIN_CONTENT_ENDPOINTS: EndpointRow[] = [
  { method: "GET", path: "/api/admin/dashboard", desc: "Dashboard analytics", auth: "bearer-or-key", group: "Admin" },
  { method: "GET", path: "/api/admin/system", desc: "System status", auth: "bearer-or-key", group: "Admin" },
  { method: "GET", path: "/api/admin/fcm/overview", desc: "FCM overview dashboard data", auth: "bearer-or-key", group: "Admin" },
  { method: "POST", path: "/api/admin/fcm/test-notification", desc: "Send FCM test push. Body: { fcm_token }", auth: "bearer-or-key", group: "Admin" },
  { method: "GET", path: "/api/admin/devices/summary", desc: "Device counts and platform split", auth: "bearer-or-key", group: "Admin" },
  { method: "GET", path: "/api/admin/devices", desc: "List registered FCM devices", auth: "bearer-or-key", group: "Admin" },
  { method: "DELETE", path: "/api/admin/devices/:id", desc: "Remove a registered FCM token", auth: "bearer-or-key", group: "Admin" },
];

export const ALL_ENDPOINT_GROUPS = [
  { id: "public", title: "Platform & docs", rows: PUBLIC_ENDPOINTS },
  { id: "mobile", title: "Mobile reminders (FCM token)", rows: MOBILE_ENDPOINTS },
  { id: "auth", title: "Admin authentication", rows: ADMIN_AUTH_ENDPOINTS },
  { id: "keys", title: "API keys (x-api-key)", rows: ADMIN_API_KEY_ENDPOINTS },
  { id: "admin", title: "Admin analytics & FCM", rows: ADMIN_CONTENT_ENDPOINTS },
] as const;

export function endpointRequiresCredential(row: EndpointRow): boolean {
  return (
    row.auth === "bearer" ||
    row.auth === "bearer-or-key" ||
    row.auth === "bearer-only" ||
    row.auth === "api-key" ||
    row.auth === "api-key-and-fcm" ||
    row.auth === "cron"
  );
}

export function authBadge(auth: EndpointRow["auth"]): { label: string; tone: "green" | "purple" | "muted" | "orange" } {
  switch (auth) {
    case "bearer-or-key":
      return { label: "Bearer or x-api-key", tone: "purple" };
    case "bearer-only":
      return { label: "Bearer JWT only", tone: "orange" };
    case "public":
      return { label: "Public", tone: "green" };
    case "api-key":
      return { label: "x-api-key", tone: "purple" };
    case "api-key-and-fcm":
      return { label: "x-api-key + x-fcm-token", tone: "purple" };
    case "bearer":
      return { label: "Bearer JWT", tone: "orange" };
    case "cron":
      return { label: "Cron secret", tone: "orange" };
    case "none":
      return { label: "No auth", tone: "muted" };
    default:
      return { label: "—", tone: "muted" };
  }
}
