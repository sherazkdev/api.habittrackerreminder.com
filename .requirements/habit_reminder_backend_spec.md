# Habit Reminder Notifications — Backend Specification

## Overview

The Flutter app currently schedules habit reminders using local
notifications on the device. This has proven unreliable across many
Android devices (especially Xiaomi, Oppo, Vivo, Huawei) due to
aggressive OEM battery managers that kill background services and
local notification schedulers, even when the standard Android
"battery optimization" exemption is granted.

To fix this, reminders will move to a **server + Firebase Cloud
Messaging (FCM)** architecture:

1. The app sends each habit's reminder schedule to our backend.
2. The backend stores it and calculates the exact time(s) the
   reminder should fire.
3. A scheduler on the backend checks, at the appropriate time,
   which habits are due, and sends a push notification via FCM to
   the correct user's device.
4. FCM handles final delivery to the device — this part is reliable
   regardless of OEM restrictions, as long as the device has
   connectivity.

The app already uses Firebase (for FCM), so no new user-facing
infrastructure is required — this is purely a backend addition.

---

## Storage (MongoDB + Mongoose)

All schedules and FCM device tokens are stored in **MongoDB** via
**Mongoose** — not Firestore.

| Collection | Purpose |
|---|---|
| `users` | One document per user (`userId` = Firebase Auth uid). Holds `fcmTokens[]`. |
| `reminders` | One document per habit per user (compound key: `userId` + `habitId`). Holds schedule + `habitName`, `notificationBody`, `scheduledTimes`. |

Firebase is used **only** for Auth token verification and FCM push
delivery.

---

## Authentication

Every request from the app is already authenticated (standard auth
token in the `Authorization` header). Use that to identify the user
— **do not expect a `userId` field in the request body.** The
backend should resolve the user from the auth token and use that
user's FCM device token when sending notifications.

---

## Habit Reminder Data Model

Each habit reminder is described by one of two mutually exclusive
modes:

### Mode 1 — Fixed time (`timer: true`)

One reminder per day, at a fixed time.

```json
{
  "habitId": "abc123",
  "habitName": "Drink Water",
  "notificationBody": "Time for your habit",
  "days": ["Everyday"],
  "timer": true,
  "repeat": false,
  "time": "08:00"
}
```

### Mode 2 — Repeated interval (`repeat: true`)

Multiple reminders per day, evenly spaced between a start and end
time.

```json
{
  "habitId": "xyz789",
  "habitName": "Stretch",
  "notificationBody": "Time for your habit",
  "days": ["Monday", "Wednesday", "Friday"],
  "timer": false,
  "repeat": true,
  "startTime": "09:00",
  "endTime": "21:00",
  "repeatCount": 4
}
```

`timer` and `repeat` are always opposite values — never both `true`
or both `false`. Whichever is `true` tells you which set of
additional fields to expect.

### Field reference

| Field | Type | Present when | Description |
|---|---|---|---|
| `habitId` | string | always | Unique identifier for the habit. Used as the key for storing/updating/deleting its schedule. |
| `habitName` | string | always | Used as the FCM notification **title** (e.g. `"Have a healthy meal"`). |
| `notificationBody` | string | always | Used as the FCM notification **body** (e.g. `"Time for your habit"`). Must be non-empty. |
| `days` | array of strings | always | Which days the reminder is active. Either `["Everyday"]` or a subset of `"Monday"`...`"Sunday"`. Never empty. |
| `timer` | boolean | always | `true` = single fixed-time mode. |
| `repeat` | boolean | always | `true` = interval mode. Exactly one of `timer`/`repeat` is `true`. |
| `time` | string (`"HH:mm"`, 24h) | `timer == true` | The single time the reminder should fire. |
| `startTime` | string (`"HH:mm"`) | `repeat == true` | Earliest time in the day a reminder can fire. |
| `endTime` | string (`"HH:mm"`) | `repeat == true` | Latest time in the day a reminder can fire. |
| `repeatCount` | integer | `repeat == true` | How many reminders to fire that day, evenly spaced between `startTime` and `endTime`. |

---

## Endpoints

### 1. Create or update a single habit's reminder

```
POST /api/habits/reminder
Authorization: Bearer <token>
Content-Type: application/json
```

Body: a single reminder object (see Mode 1 / Mode 2 above).

This same endpoint is used for **both** creating a new reminder and
updating an existing one. If `habitId` already exists for this user,
**replace** its stored schedule entirely with the new data — do not
create a duplicate.

**Important — partial updates:** when the user edits only one habit
(changes its time, days, start/end time, etc.), the app will send
**only that one habit's payload**, not the full list of the user's
habits. The backend should update just that `habitId`'s record and
leave all other habits untouched.

### 2. Delete a habit's reminder

```
DELETE /api/habits/reminder/{habitId}
Authorization: Bearer <token>
```

Remove all stored/scheduled reminders for this `habitId`.

### 3. Bulk sync (multiple habits at once)

```
POST /api/habits/reminder/bulk
Authorization: Bearer <token>
Content-Type: application/json
```

Body: a plain JSON **array** of reminder objects (no wrapper object,
no `userId` field — the user comes from the auth token):

```json
[
  {
    "habitId": "abc123",
    "habitName": "Drink Water",
    "notificationBody": "Time for your habit",
    "days": ["Everyday"],
    "timer": true,
    "repeat": false,
    "time": "08:00"
  },
  {
    "habitId": "xyz789",
    "habitName": "Stretch",
    "notificationBody": "Time for your habit",
    "days": ["Monday", "Wednesday", "Friday"],
    "timer": false,
    "repeat": true,
    "startTime": "09:00",
    "endTime": "21:00",
    "repeatCount": 4
  }
]
```

This is only used for scenarios where many habits need to be synced
at once — a fresh install, a login on a new device, or flushing a
queue of changes that were made while offline. Process each array
entry the same way as a single-habit request. **This is not the
normal edit flow** — everyday habit edits go through the single
endpoint above.

---

## Scheduling logic (Mode 2 — repeat)

Given `startTime`, `endTime`, and `repeatCount`, calculate the
reminder times as evenly spaced points from `startTime` to
`endTime` inclusive:

```
gap = (endTime - startTime) / (repeatCount - 1)   // when repeatCount > 1
```

**Example:** `startTime = 09:00`, `endTime = 21:00`, `repeatCount = 4`

```
Total range = 12 hours = 720 minutes
gap = 720 / (4 - 1) = 240 minutes = 4 hours

Reminder times: 09:00, 13:00, 17:00, 21:00
```

If `repeatCount == 1`, fire only at `startTime` (edge case — handle
so it doesn't divide by zero).

---

## Sending the notification (FCM)

1. On each incoming request, store the habit's schedule (resolved
   reminder time or times) against the user, keyed by `habitId`.
2. Run a scheduler (cron job, cloud scheduler, or equivalent) that
   checks, at short intervals (e.g. every minute), which stored
   reminders are due right now.
3. For a match, also check that today's day-of-week is included in
   that habit's `days` list (or `days` is `["Everyday"]`). If today
   isn't included, skip — do not delete the schedule, it's
   recurring.
4. Look up the user's current FCM device token and send via
   Firebase Admin SDK:
   - **Title:** `habitName` (exactly as sent by the app)
   - **Body:** `notificationBody` (exactly as sent by the app)
   - **Data payload:** `{ "habitId": habitId }` so the app can deep
     link to that habit when the notification is tapped.
5. If sending fails because the token is no longer registered
   (`messaging/registration-token-not-registered`), remove that
   token from storage so it isn't retried indefinitely.

---

## Validation

- `time`, `startTime`, `endTime` must be valid `"HH:mm"` 24-hour
  strings.
- `repeatCount >= 1`.
- `startTime` must be earlier than `endTime`.
- Exactly one of `timer` / `repeat` must be `true` — reject with
  `400 Bad Request` otherwise.
- `days` must contain at least one valid day name or `"Everyday"`.
- `habitName` and `notificationBody` must be non-empty strings.

## Response format

```json
{
  "success": true,
  "habitId": "abc123",
  "scheduledTimes": ["08:00"]
}
```

For repeat mode, `scheduledTimes` should contain all calculated
times (e.g. `["09:00", "13:00", "17:00", "21:00"]`) so the app can
confirm the server computed them correctly.
