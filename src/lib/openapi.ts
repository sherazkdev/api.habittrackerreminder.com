import { env } from "@/lib/env";

type Audience = "full" | "public";

function servers() {
  return [{ url: env.publicUrl(), description: "This environment" }];
}

const securitySchemes = {
  bearerAuth: {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
    description: "Admin access token from POST /api/admin/login, or Firebase ID token for mobile routes.",
  },
  apiKeyAuth: {
    type: "apiKey",
    in: "header",
    name: "x-api-key",
    description: "Admin API key created in Settings → API Keys. Shown once at creation.",
  },
  cronSecret: {
    type: "http",
    scheme: "bearer",
    description: "CRON_SECRET. Also accepted as x-cron-secret header.",
  },
};

const reminderSchema = {
  type: "object",
  required: ["habitId", "habitName", "notificationBody", "days", "timer", "repeat"],
  properties: {
    habitId: { type: "string", example: "abc123" },
    habitName: { type: "string", example: "Drink Water" },
    notificationBody: { type: "string", example: "Time for your habit" },
    days: {
      type: "array",
      items: {
        type: "string",
        enum: ["Everyday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      },
      example: ["Everyday"],
    },
    timer: { type: "boolean", example: true },
    repeat: { type: "boolean", example: false },
    time: { type: "string", example: "08:00" },
    startTime: { type: "string", example: "09:00" },
    endTime: { type: "string", example: "21:00" },
    repeatCount: { type: "integer", example: 4 },
  },
};

function envelope(schema: Record<string, unknown>) {
  return {
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      data: schema,
    },
  };
}

export function buildOpenApiSpec(audience: Audience = "full") {
  const publicPaths = {
    "/health": {
      get: {
        tags: ["Platform"],
        summary: "Liveness probe",
        security: [],
        responses: { 200: { description: "OK" } },
      },
    },
    "/ready": {
      get: {
        tags: ["Platform"],
        summary: "Readiness (Mongo + Firebase)",
        security: [],
        responses: { 200: { description: "Ready" }, 503: { description: "Not ready" } },
      },
    },
    "/api/v1": {
      get: {
        tags: ["Public"],
        summary: "API discovery",
        security: [],
        responses: { 200: { description: "Discovery document" } },
      },
    },
    "/api/v1/openapi.json": {
      get: {
        tags: ["Public"],
        summary: "OpenAPI 3.0 spec",
        security: [],
        parameters: [
          {
            name: "audience",
            in: "query",
            schema: { type: "string", enum: ["full", "public"] },
          },
        ],
        responses: { 200: { description: "OpenAPI JSON" } },
      },
    },
    "/api/v1/habits/reminder": {
      post: {
        tags: ["Mobile"],
        summary: "Create or replace one habit reminder",
        description:
          "Saves or replaces the habit schedule only — does not send a notification. Firebase Bearer, or admin `x-api-key` plus `x-user-id`. The cron worker sends the push when the scheduled time is due.",
        security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
        parameters: [
          {
            name: "x-user-id",
            in: "header",
            required: false,
            schema: { type: "string" },
            description: "Required when calling with admin auth instead of a Firebase token.",
          },
        ],
        requestBody: {
          required: true,
          content: { "application/json": { schema: reminderSchema } },
        },
        responses: {
          200: {
            description: "Upserted. Spec shape: success, habitId, scheduledTimes.",
            content: { "application/json": { schema: envelope({ type: "object" }) } },
          },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/habits/reminder": {
      post: {
        tags: ["Mobile"],
        summary: "Create or replace one habit reminder (spec path)",
        description: "Alias of POST /api/v1/habits/reminder for the Flutter spec.",
        security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
        parameters: [
          {
            name: "x-user-id",
            in: "header",
            required: false,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: { "application/json": { schema: reminderSchema } },
        },
        responses: { 200: { description: "Upserted" }, 401: { description: "Unauthorized" } },
      },
    },
    "/api/v1/habits/reminder/{habitId}": {
      delete: {
        tags: ["Mobile"],
        summary: "Delete a habit reminder",
        security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
        parameters: [
          { name: "habitId", in: "path", required: true, schema: { type: "string" } },
          { name: "x-user-id", in: "header", required: false, schema: { type: "string" } },
        ],
        responses: { 200: { description: "Deleted" }, 404: { description: "Not found" } },
      },
    },
    "/api/habits/reminder/{habitId}": {
      delete: {
        tags: ["Mobile"],
        summary: "Delete a habit reminder (spec path)",
        security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
        parameters: [
          { name: "habitId", in: "path", required: true, schema: { type: "string" } },
          { name: "x-user-id", in: "header", required: false, schema: { type: "string" } },
        ],
        responses: { 200: { description: "Deleted" }, 404: { description: "Not found" } },
      },
    },
    "/api/v1/habits/reminder/bulk": {
      post: {
        tags: ["Mobile"],
        summary: "Bulk upsert reminders",
        security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
        parameters: [{ name: "x-user-id", in: "header", required: false, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "array", items: reminderSchema } } },
        },
        responses: { 200: { description: "Upserted" } },
      },
    },
    "/api/habits/reminder/bulk": {
      post: {
        tags: ["Mobile"],
        summary: "Bulk upsert reminders (spec path)",
        security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
        parameters: [{ name: "x-user-id", in: "header", required: false, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "array", items: reminderSchema } } },
        },
        responses: { 200: { description: "Upserted" } },
      },
    },
    "/api/v1/devices": {
      post: {
        tags: ["Mobile"],
        summary: "Register FCM device token",
        description:
          "Saves the FCM token only — does not send a notification. App: Firebase Bearer. Admin/Postman: `x-api-key` + body `fcm_token`. Do not send `x-user-id`.",
        security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["fcm_token"],
                properties: {
                  fcm_token: {
                    type: "string",
                    description: "FCM registration token from the phone. Used to find or create the user when calling with x-api-key.",
                    example: "dXyz...:APA91b...",
                  },
                  platform: { type: "string", enum: ["android", "ios"], example: "android" },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Token saved. No notification is sent.",
            content: {
              "application/json": {
                schema: envelope({
                  type: "object",
                  properties: {
                    registered: { type: "boolean", example: true },
                    userId: { type: "string" },
                  },
                }),
              },
            },
          },
          401: { description: "Missing Firebase Bearer or x-api-key" },
        },
      },
      delete: {
        tags: ["Mobile"],
        summary: "Unregister FCM device token",
        description: "Firebase Bearer, or x-api-key + body fcm_token. No x-user-id header.",
        security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["fcm_token"],
                properties: { fcm_token: { type: "string" } },
              },
            },
          },
        },
        responses: { 200: { description: "Unregistered" }, 401: { description: "Unauthorized" } },
      },
    },
    "/api/v1/habits/cron/reminder": {
      get: {
        tags: ["Cron"],
        summary: "Dispatch due reminders",
        security: [{ cronSecret: [] }],
        responses: { 200: { description: "Dispatch result" }, 401: { description: "Unauthorized" } },
      },
    },
    "/api/cron/reminders": {
      get: {
        tags: ["Cron"],
        summary: "Dispatch due reminders (spec path)",
        security: [{ cronSecret: [] }],
        responses: { 200: { description: "Dispatch result" }, 401: { description: "Unauthorized" } },
      },
    },
  };

  const adminPaths = {
    "/api/admin/login": {
      post: {
        tags: ["Admin auth"],
        summary: "Email/password → Bearer accessToken",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Logged in" }, 401: { description: "Invalid credentials" } },
      },
    },
    "/api/admin/refresh": {
      post: {
        tags: ["Admin auth"],
        summary: "Refresh cookie → new accessToken",
        security: [],
        responses: { 200: { description: "Refreshed" }, 401: { description: "Expired" } },
      },
    },
    "/api/admin/logout": {
      post: {
        tags: ["Admin auth"],
        summary: "Revoke refresh session",
        security: [],
        responses: { 200: { description: "Logged out" } },
      },
    },
    "/api/admin/change-password": {
      post: {
        tags: ["Admin auth"],
        summary: "Change password (Bearer only)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["currentPassword", "newPassword", "confirmPassword"],
                properties: {
                  currentPassword: { type: "string" },
                  newPassword: { type: "string" },
                  confirmPassword: { type: "string" },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Password changed" } },
      },
    },
    "/api/admin/api-keys": {
      get: {
        tags: ["API keys"],
        summary: "List API keys (masked)",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Key list" } },
      },
      post: {
        tags: ["API keys"],
        summary: "Create x-api-key (shown once)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: { name: { type: "string", example: "Swagger local" } },
              },
            },
          },
        },
        responses: { 201: { description: "Created" } },
      },
    },
    "/api/admin/api-keys/{id}": {
      delete: {
        tags: ["API keys"],
        summary: "Revoke API key",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Revoked" } },
      },
    },
    "/api/admin/dashboard": {
      get: {
        tags: ["Admin"],
        summary: "Dashboard analytics",
        security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
        responses: { 200: { description: "Analytics" } },
      },
    },
    "/api/admin/system": {
      get: {
        tags: ["Admin"],
        summary: "System status",
        security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
        responses: { 200: { description: "Status" } },
      },
    },
    "/api/admin/fcm/overview": {
      get: {
        tags: ["Admin"],
        summary: "FCM overview",
        security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
        responses: { 200: { description: "Overview" } },
      },
    },
    "/api/admin/fcm/test-notification": {
      post: {
        tags: ["Admin"],
        summary: "Send FCM test push",
        security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["fcm_token"],
                properties: { fcm_token: { type: "string" } },
              },
            },
          },
        },
        responses: { 200: { description: "Send result" } },
      },
    },
    "/api/admin/devices/summary": {
      get: {
        tags: ["Admin"],
        summary: "Registered device summary",
        security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
        responses: { 200: { description: "Stats and analytics" } },
      },
    },
    "/api/admin/devices": {
      get: {
        tags: ["Admin"],
        summary: "List registered FCM devices",
        security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
        parameters: [
          { name: "platform", in: "query", schema: { type: "string", enum: ["android", "ios"] } },
          { name: "status", in: "query", schema: { type: "string", enum: ["active", "stale"] } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
        ],
        responses: { 200: { description: "Device list" } },
      },
    },
    "/api/admin/devices/{id}": {
      delete: {
        tags: ["Admin"],
        summary: "Remove a registered FCM token",
        security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Removed" }, 404: { description: "Not found" } },
      },
    },
  };

  return {
    openapi: "3.0.3",
    info: {
      title: audience === "public" ? "Habit Tracker Public API" : "Habit Tracker API",
      version: env.appVersion(),
      description:
        audience === "public"
          ? "Mobile APIs. **Reminders:** Firebase ID token (Bearer), or admin `x-api-key` plus `x-user-id`. **Devices:** Firebase Bearer, or `x-api-key` plus body `fcm_token` — no `x-user-id`."
          : "Use **Authorize** for Bearer JWT (`POST /api/admin/login`) or `x-api-key` (Settings → API Keys). Admin analytics accept both. **Devices** (`POST /api/v1/devices`): Firebase Bearer **or** `x-api-key` + `{ fcm_token }` — do not send `x-user-id`. Reminder write routes still need a Firebase token, or `x-api-key` + `x-user-id`.",
    },
    servers: servers(),
    tags: [
      { name: "Platform", description: "Health and readiness" },
      { name: "Public", description: "Discovery and OpenAPI" },
      { name: "Mobile", description: "Flutter app. Devices: Firebase Bearer or x-api-key + fcm_token. Reminders: Firebase Bearer or x-api-key + x-user-id." },
      { name: "Cron", description: "Scheduler" },
      { name: "Admin auth", description: "Admin login and password" },
      { name: "API keys", description: "x-api-key management (Bearer only)" },
      { name: "Admin", description: "Dashboard and FCM — Bearer or x-api-key" },
    ],
    paths: audience === "public" ? publicPaths : { ...publicPaths, ...adminPaths },
    components: { securitySchemes },
  };
}
