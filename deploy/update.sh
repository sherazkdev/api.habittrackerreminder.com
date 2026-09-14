#!/usr/bin/env bash
set -euo pipefail

# Safe update on an existing Contabo VPS.
# Stops ONLY this app before npm ci so PM2 cannot crash-loop on a missing Next binary.
# Never run `pm2 restart all` / `pm2 stop all` on this host — other apps share PM2.

if [ -d /var/www/habit-tracker-api ]; then
  DEFAULT_DIR=/var/www/habit-tracker-api
elif [ -d /var/www/habit-api ]; then
  DEFAULT_DIR=/var/www/habit-api
else
  DEFAULT_DIR=/var/www/habit-tracker-api
fi

APP_DIR="${APP_DIR:-$DEFAULT_DIR}"
cd "$APP_DIR"

HABIT_PM2_NAMES=(habit-reminder-api habit-reminder-cron habit-api habit-cron)

stop_habit_apps() {
  for name in "${HABIT_PM2_NAMES[@]}"; do
    if pm2 describe "$name" >/dev/null 2>&1; then
      pm2 stop "$name" || true
    fi
  done
}

delete_habit_apps() {
  for name in "${HABIT_PM2_NAMES[@]}"; do
    if pm2 describe "$name" >/dev/null 2>&1; then
      pm2 delete "$name" || true
    fi
  done
}

echo "[update] stopping habit PM2 apps in $APP_DIR"
stop_habit_apps

git pull --ff-only
npm ci
npm run build

echo "[update] replacing habit PM2 apps from ecosystem.config.cjs"
delete_habit_apps
pm2 start ecosystem.config.cjs
pm2 save
pm2 status habit-reminder-api habit-reminder-cron
