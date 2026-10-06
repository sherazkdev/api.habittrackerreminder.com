# Habit Tracker — mobile & public endpoints

Base URL: `https://habittrackerapi.com`

The phone has **no user account**. It only has an FCM token and an API key. Never send `x-user-id` or a Firebase Auth Bearer token.

**Skip rule:** cron sends only to the FCM token saved on the same device record as the reminder. If you register the token first, then create the reminder with that same token in `x-fcm-token`, the job is **not** Skipped (`tokenCount: 0`). Skip happens only when that device record has no token (never registered, unregistered, or an old leftover reminder from before this flow).

## Sequence (required)

1. `POST /api/v1/devices` with `x-api-key` and body `{ "fcmToken", "timezone" (IANA), "installationId" (stable UUID) }`
2. `POST /api/v1/habits/reminder` with `x-api-key` + `x-fcm-token: <same current token>`
3. When Firebase refreshes the token: `POST /api/v1/devices` with `fcmToken` (new) + `previousFcmToken` (old) + same `installationId`. Reminders stay on the same record.
4. Cron (`GET /api/v1/habits/cron/reminder`) sends the push when the clock hits the scheduled minute in **that reminder’s IANA timezone** (from the device or reminder body). `POST /reminder` does **not** send a notification.

---

## Platform (no auth)

| Method | Path | Params | Response |
| --- | --- | --- | --- |
| `GET` | `/health` | none | `{ "ok": true }` |
| `GET` | `/ready` | none | Mongo + Firebase ready |
| `GET` | `/api/v1/` | none | Discovery document |
| `GET` | `/api/v1/openapi.json` | query `audience=full` \| `public` | OpenAPI 3.0 JSON |
| `GET` | `/docs` | none | Admin Swagger UI |
| `GET` | `/docs/public` | none | Public / mobile Swagger UI |

---

## Mobile

### `POST /api/v1/devices`

Register or refresh the phone FCM token. **Does not send a push.**

| | |
| --- | --- |
| Auth | Header `x-api-key` (alias `x-apikey`) |
| Body | JSON |

**Body**

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `fcmToken` | string | yes* | Current FCM token. Alias: `fcm_token` |
| `platform` | `"android"` \| `"ios"` | no | |
| `timezone` | string | **yes** | IANA name from the phone, e.g. `America/New_York`, `Asia/Karachi`. Alias: `time_zone` |
| `previousFcmToken` | string | no | Old token on refresh. Alias: `previous_fcm_token` |

\* One of `fcmToken` / `fcm_token` is required.

**200**

```json
{ "success": true, "data": { "registered": true } }
```

The app must **not** store a generated `fcm-*` user id. Use the FCM token on later requests.

| Status | When |
| --- | --- |
| `400` | Missing token |
| `401` | Bad / missing `x-api-key` |
| `404` | `PREVIOUS_DEVICE_TOKEN_NOT_FOUND` |
| `409` | `FCM_TOKEN_CONFLICT` (new token already on another record) |

```http
POST /api/v1/devices
x-api-key: YOUR_API_KEY
Content-Type: application/json

{ "fcmToken": "e-Z5BkttRmOp-S1lPZfsEl:APA91b...", "platform": "android", "timezone": "America/New_York" }
```

Token refresh:

```json
{
  "fcmToken": "NEW_TOKEN",
  "previousFcmToken": "OLD_TOKEN",
  "platform": "android"
}
```

---

### `DELETE /api/v1/devices`

Unregister a token. After this, reminders on that record skip until you register again.

| | |
| --- | --- |
| Auth | Header `x-api-key` |
| Body | `{ "fcmToken": "..." }` or `{ "fcm_token": "..." }` |

**200** `{ "success": true, "data": { "unregistered": true } }`

Note: this only removes the FCM token. **Habit schedules and delivery history stay on the server** until you delete them or call **Delete my data** below.

---

### `DELETE /api/v1/devices/data`

Remove **all** server-side data for the registered phone: every reminder, notification delivery log row, and the device user record. Use for Settings → Delete my data / privacy requests.

| | |
| --- | --- |
| Auth | `x-api-key` + header `x-fcm-token` |
| Body | none |

**200**

```json
{
  "success": true,
  "data": {
    "deletedReminders": 3,
    "deletedDeliveries": 12,
    "deletedUser": true
  }
}
```

| Status | When |
| --- | --- |
| `400` | Missing `x-fcm-token` |
| `401` | Bad / missing `x-api-key` |
| `429` | `RATE_LIMITED` — too many requests (see rate limits below) |

Idempotent: unknown or already-deleted token → **200** with `alreadyDeleted: true` and zero counts.

After success, call `POST /api/v1/devices` again if the user turns reminders back on.

**Rate limits (default):** 30 device calls and 120 reminder calls per IP + API key per 60 seconds. Response `429` includes `Retry-After` (seconds). Override with env `MOBILE_RATE_LIMIT_*` on the server.

---

### `POST /api/v1/habits/reminder`

Save one habit schedule. Cron sends later. Alias: `POST /api/habits/reminder`.

| | |
| --- | --- |
| Auth | `x-api-key` + `x-fcm-token` |
| Body | JSON object |

**Headers**

| Header | Required | Notes |
| --- | --- | --- |
| `x-api-key` | yes | Dashboard API key |
| `x-fcm-token` | yes | Same token registered on `/devices` |

**Body**

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `habitId` | string | yes | App habit id |
| `habitName` | string | yes | Notification title |
| `notificationBody` | string | yes | Notification body |
| `days` | string[] | yes | `Everyday` or weekday names (`Monday`…`Sunday`) |
| `timer` | boolean | yes | `true` = one clock time |
| `repeat` | boolean | yes | `true` = interval between start/end |
| `time` | `"HH:mm"` | if `timer` | Local wall time in the reminder `timezone` (device default), e.g. `"20:00"` |
| `timezone` | string | no | IANA override per habit; if omitted, uses the timezone saved on `/devices` |
| `startTime` | `"HH:mm"` | if `repeat` | |
| `endTime` | `"HH:mm"` | if `repeat` | |
| `repeatCount` | integer | if `repeat` | How many times in the window |

**200** `{ "success": true, "habitId": "...", "scheduledTimes": ["16:30"], "timezone": "America/New_York" }`

| Status | When |
| --- | --- |
| `400` | Missing `x-fcm-token` or invalid body |
| `401` | Bad / missing `x-api-key` |
| `404` | `DEVICE_NOT_REGISTERED` — call `/devices` first |

Timer example:

```http
POST /api/v1/habits/reminder
x-api-key: YOUR_API_KEY
x-fcm-token: e-Z5BkttRmOp-S1lPZfsEl:APA91b...
Content-Type: application/json

{
  "habitId": "habit_001",
  "habitName": "Morning Walk",
  "notificationBody": "Time for your habit",
  "days": ["Monday", "Tuesday"],
  "timer": true,
  "repeat": false,
  "time": "15:13"
}
```

Repeat example:

```json
{
  "habitId": "stretch-1",
  "habitName": "Stretch",
  "notificationBody": "Time for your habit",
  "days": ["Everyday"],
  "timer": false,
  "repeat": true,
  "startTime": "09:00",
  "endTime": "21:00",
  "repeatCount": 4
}
```

---

### `DELETE /api/v1/habits/reminder/{habitId}`

Delete one reminder for this device. Alias: `DELETE /api/habits/reminder/{habitId}`.

| | |
| --- | --- |
| Auth | `x-api-key` + `x-fcm-token` |
| Path | `habitId` — same id used on create |

**200** deleted · **404** not found or device not registered

---

### `POST /api/v1/habits/reminder/bulk`

Upsert many reminders. Alias: `POST /api/habits/reminder/bulk`.

| | |
| --- | --- |
| Auth | `x-api-key` + `x-fcm-token` |
| Body | JSON **array** of the same reminder objects as above |

---

### `GET /api/v1/habits/cron/reminder`

Dispatch due reminders for the current minute in each stored IANA timezone (legacy rows without `timezone` use `REMINDER_TIMEZONE`, default `Asia/Karachi`). Alias: `GET /api/cron/reminders`.

| | |
| --- | --- |
| Auth | `Authorization: Bearer <CRON_SECRET>` or header `x-cron-secret` |
| Query | none |

Server / PM2 calls this. The mobile app does not.

---

## Admin (dashboard — not used by the phone)

| Method | Path | Auth | Body / params |
| --- | --- | --- | --- |
| `POST` | `/api/admin/login` | none | `{ email, password }` → Bearer `accessToken` |
| `POST` | `/api/admin/refresh` | refresh cookie | none |
| `POST` | `/api/admin/logout` | none | none |
| `POST` | `/api/admin/change-password` | Bearer JWT | `{ currentPassword, newPassword, confirmPassword }` |
| `GET` | `/api/admin/api-keys` | Bearer JWT | none |
| `POST` | `/api/admin/api-keys` | Bearer JWT | `{ name }` — key shown once |
| `DELETE` | `/api/admin/api-keys/{id}` | Bearer JWT | path `id` |
| `GET` | `/api/admin/dashboard` | Bearer or `x-api-key` | none |
| `GET` | `/api/admin/system` | Bearer or `x-api-key` | none |
| `GET` | `/api/admin/fcm/overview` | Bearer or `x-api-key` | none |
| `POST` | `/api/admin/fcm/test-notification` | Bearer or `x-api-key` | `{ "fcm_token": "..." }` |
| `GET` | `/api/admin/devices/summary` | Bearer or `x-api-key` | none |
| `GET` | `/api/admin/devices` | Bearer or `x-api-key` | query: `platform`, `status`, `search`, `page`, `limit` |
| `DELETE` | `/api/admin/devices/{id}` | Bearer or `x-api-key` | path `id` |

Interactive docs: `/docs` (full) and `/docs/public` (mobile only).

---

## Release contract (P0 — mobile must implement)

### Timezone (P0.1)

| Step | Required |
| --- | --- |
| Every `POST /api/v1/devices` | `timezone` / `time_zone` — IANA from OS (e.g. `flutter_timezone`). **Not** GMT offset alone. |
| Every reminder upsert | Optional per-habit `timezone`; if omitted, server uses device timezone from step 1. |
| App OS timezone changes | Call `POST /devices` again with new `timezone` (server updates all reminders for that device). |
| Response field | `timezoneSource`: `reminder` \| `device` \| `server_default` — if `server_default`, app should send device timezone before relying on cron. |

**Legacy APK (no timezone):** server uses `REMINDER_TIMEZONE` (env, default `Asia/Karachi`). Treat as wrong for non-Pakistan users until app updates.

**DST:** server uses `Intl` + IANA; local app must use `timezone` package / `zonedSchedule` with the same IANA id.

### FCM + identity (P0.2)

| Field | Required |
| --- | --- |
| `installationId` / `installation_id` | Stable random id (8–64 chars), stored in app storage until **Delete my data**. Same id on every `/devices` call. |
| `previousFcmToken` | Required when Firebase rotates the token. |
| After reinstall / new token **without** `previousFcmToken` | If `installationId` is unchanged → server keeps same `userId` and reminders. If `installationId` is new (e.g. clear data) → **new `userId`**; app **must** bulk-sync all habits via `POST /habits/reminder/bulk`. |

**Orphan reminders:** old `userId` rows remain in Mongo until TTL/admin cleanup; they no longer receive pushes. Not a functional bug if app re-syncs.

### Local notifications primary (P0.4)

| Responsibility | Owner |
| --- | --- |
| Fire at correct local time offline | **App** (`flutter_local_notifications` + IANA) |
| Backup / sync schedule to server | App → this API |
| Cron FCM at due minute | **Server** (backup only; data-only `habit_reminder`) |

App must: schedule locally on save/delete/timezone change/boot; sync server in background; on FCM `habit_reminder`, refresh UI optional — do not rely on FCM as only alarm.

### FCM payload (P0.5)

This API **only** sends habit cron pushes:

```json
{ "type": "habit_reminder", "habitId", "habitName", "notificationBody" }
```

**No `task_reminder`** from this API. Task alarms are a **mobile-only** issue unless you add a future server task API.

### Delete my data (P0.7)

Settings → call:

```http
DELETE /api/v1/devices/data
x-api-key: ...
x-fcm-token: <current>
```

Then clear local DB + `installationId` if user may start fresh. Safe to call twice (`alreadyDeleted: true`, zeros).

### API key (P0.6)

Treat `x-api-key` as public. Rotate via admin; revoked key → `401`. Rate limit → `429` + `Retry-After`.

### Production cron (ops)

Reminder dispatch must run from **one** place only (VPS: `habit-reminder-cron` PM2 worker → loopback). `vercel.json` has **no** crons (empty) to avoid double dispatch with VPS.
