/** Habit API internal port on VPS (Nginx proxies here). Change only this line. */
const APP_PORT = "3012";
const LOOPBACK = `http://127.0.0.1:${APP_PORT}`;

module.exports = {
  apps: [
    {
      name: "habit-api",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: `start -H 127.0.0.1 -p ${APP_PORT}`,
      instances: 1,
      exec_mode: "fork",
      env_file: ".env.local",
      env: {
        NODE_ENV: "production",
        PORT: APP_PORT,
      },
    },
    {
      name: "habit-cron",
      cwd: __dirname,
      script: "scripts/cron-worker.mjs",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      env_file: ".env.local",
      env: {
        NODE_ENV: "production",
        PORT: APP_PORT,
        CRON_INTERNAL_URL: LOOPBACK,
      },
    },
  ],
};
