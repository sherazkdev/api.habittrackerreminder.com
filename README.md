# Habit Tracker Reminder API

Server-side habit reminders with Firebase Cloud Messaging, an admin console, and Swagger.

## Local setup

```bash
npm install
cp .env.example .env.local
```

Fill `.env.local` with MongoDB, Firebase Admin, JWT, and `CRON_SECRET` values. Then:

```bash
npm run seed
npm run test
npm run dev
```

- Home: http://localhost:3000
- Admin: http://localhost:3000/admin/login (`ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD`)
- Swagger: http://localhost:3000/docs

`npm run seed` creates the first admin (if missing) and the spec demo habits for user `seed-dev-user`. Use `--reset-admin` to reset the admin password, or `--no-demo` to skip sample reminders.

Mobile reminder routes also exist at the spec paths (`/api/habits/reminder`, `/api/cron/reminders`) as aliases of `/api/v1/...`.

## Auth

- Admin dashboard: Bearer JWT from `POST /api/admin/login`
- Admin APIs: Bearer JWT **or** `x-api-key`
- Mobile reminder/device APIs: Firebase ID token, or admin auth plus `x-user-id`
- Cron: `Authorization: Bearer <CRON_SECRET>` or `x-cron-secret`

## Deploy on Contabo VPS

Vercel cron does **not** run on a VPS. Use Nginx + PM2 (`habit-api` + `habit-cron`).

1. Point `api.habittrackerreminder.com` A-record to the VPS IP.
2. SSH in as root and install Node 20, Nginx, PM2, then clone this repo to `/var/www/habit-api`.
3. Copy `.env.example` to `.env.local` and set production values (`COOKIE_SECURE=true`, `ADMIN_SEED_ENABLED=false`, `API_PUBLIC_URL=https://api.habittrackerreminder.com`).
4. `npm ci && npm run build`
5. `pm2 start ecosystem.config.cjs && pm2 save && pm2 startup`
6. Copy `deploy/nginx.conf` into sites-enabled and `certbot --nginx -d api.habittrackerreminder.com`.

Or run `DOMAIN=api.habittrackerreminder.com bash deploy/contabo.sh` (creates `.env.local` on first run — fill secrets, run again).

Keep port `3000` bound to localhost only. Atlas: allow the VPS public IP. First admin: `npm run seed` once on the server, then leave `ADMIN_SEED_ENABLED=false`.
