import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/habits/reminder/bulk",
        destination: "/api/v1/habits/reminder/bulk",
      },
      {
        source: "/api/habits/reminder/:habitId",
        destination: "/api/v1/habits/reminder/:habitId",
      },
      {
        source: "/api/habits/reminder",
        destination: "/api/v1/habits/reminder",
      },
      {
        source: "/api/cron/reminders",
        destination: "/api/v1/habits/cron/reminder",
      },
    ];
  },
};

export default nextConfig;
