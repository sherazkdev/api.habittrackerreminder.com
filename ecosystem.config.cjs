/** Habit API internal port on VPS (Nginx proxies here). Change only this line. */
const fs = require("fs");
const path = require("path");

const APP_PORT = "3012";
const LOOPBACK = `http://127.0.0.1:${APP_PORT}`;

const envFile =
  [".env.local", ".env"].find((name) => fs.existsSync(path.join(__dirname, name))) ??
  ".env.local";

const restartGuard = {
  instances: 1,
  exec_mode: "fork",
  autorestart: true,
  min_uptime: "10s",
  max_restarts: 20,
  exp_backoff_restart_delay: 1000,
  kill_timeout: 8000,
  env_file: envFile,
};

module.exports = {
  apps: [
    {
      name: "habit-reminder-api",
      cwd: __dirname,
      script: "scripts/start-api.mjs",
      interpreter: "node",
      ...restartGuard,
      env: {
        NODE_ENV: "production",
        HOST: "127.0.0.1",
        PORT: APP_PORT,
      },
    },
    {
      name: "habit-reminder-cron",
      cwd: __dirname,
      script: "scripts/cron-worker.mjs",
      interpreter: "node",
      ...restartGuard,
      env: {
        NODE_ENV: "production",
        PORT: APP_PORT,
        CRON_INTERNAL_URL: LOOPBACK,
      },
    },
  ],
};
