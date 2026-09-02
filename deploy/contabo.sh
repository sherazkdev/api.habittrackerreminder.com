#!/usr/bin/env bash
set -euo pipefail

# Run on a fresh Ubuntu Contabo VPS as root (or with sudo).
# Usage: DOMAIN=api.habittrackerreminder.com bash deploy/contabo.sh

DOMAIN="${DOMAIN:-api.habittrackerreminder.com}"
APP_DIR="${APP_DIR:-/var/www/habit-api}"
REPO="${REPO:-https://github.com/sherazkdev/api.habittrackerreminder.com.git}"
NODE_MAJOR="${NODE_MAJOR:-20}"

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl git nginx ufw

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi

npm install -g pm2

ufw allow OpenSSH
ufw allow "Nginx Full"
ufw --force enable

mkdir -p "$(dirname "$APP_DIR")"
if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO" "$APP_DIR"
else
  git -C "$APP_DIR" pull --ff-only
fi

cd "$APP_DIR"

if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "Created $APP_DIR/.env.local — fill secrets, then run this script again."
  exit 0
fi

npm ci
npm run build

install -m 644 deploy/nginx.conf /etc/nginx/sites-available/habit-api
sed -i "s/api.habittrackerreminder.com/${DOMAIN}/g" /etc/nginx/sites-available/habit-api
ln -sfn /etc/nginx/sites-available/habit-api /etc/nginx/sites-enabled/habit-api
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd -u root --hp /root | tail -n 1 | bash || true

echo
echo "App is on 127.0.0.1:3012 behind Nginx."
echo "Point ${DOMAIN} A-record to this VPS, then:"
echo "  apt-get install -y certbot python3-certbot-nginx"
echo "  certbot --nginx -d ${DOMAIN}"
echo "Set API_PUBLIC_URL=https://${DOMAIN} and COOKIE_SECURE=true in .env.local, then: pm2 restart all"
