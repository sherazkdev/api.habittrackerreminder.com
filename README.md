# Habit Tracker Reminder API

Server-side habit reminders with Firebase Cloud Messaging, an admin console, and Swagger.

## Local setup

```bash
npm install
cp .env.example .env.local
```

Fill `.env.local` with MongoDB, Firebase Admin, JWT, and `CRON_SECRET` values. Then:

```bash
npm run dev
```

- Home: http://localhost:3000
- Admin: http://localhost:3000/admin/login
- Swagger: http://localhost:3000/docs

## Auth

- Admin dashboard: Bearer JWT from `POST /api/admin/login`
- Admin APIs: Bearer JWT **or** `x-api-key`
- Mobile reminder/device APIs: Firebase ID token, or admin auth plus `x-user-id`
- Cron: `Authorization: Bearer <CRON_SECRET>` or `x-cron-secret`

## Deploy

Set the same variables from `.env.example` on the host (Vercel / Node). Use a production MongoDB URI, strong JWT secrets, `COOKIE_SECURE=true`, and `ADMIN_SEED_ENABLED=false` after the first admin exists. Vercel cron is in `vercel.json` (`* * * * *` on `/api/v1/habits/cron/reminder`).
