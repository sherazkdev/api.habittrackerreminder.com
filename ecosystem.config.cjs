module.exports = {
  apps: [
    {
      name: "habit-api",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start -H 127.0.0.1 -p 3000",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
    {
      name: "habit-cron",
      cwd: __dirname,
      script: "scripts/cron-worker.mjs",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        CRON_INTERNAL_URL: "http://127.0.0.1:3000",
      },
    },
  ],
};
