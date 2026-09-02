import { loadLocalEnv } from "./load-env";

loadLocalEnv();

async function main() {
  const resetAdmin = process.argv.includes("--reset-admin");
  const demo = !process.argv.includes("--no-demo");
  const allowProd = process.env.ALLOW_PROD_SEED === "true";

  if (process.env.NODE_ENV === "production" && !allowProd) {
    console.error("Refusing to seed production. Set ALLOW_PROD_SEED=true if you intend this.");
    process.exit(1);
  }

  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is missing. Copy .env.example to .env.local and fill MongoDB first.");
    process.exit(1);
  }

  const { disconnectSeed, runDevSeed } = await import("../src/lib/dev-seed");

  try {
    const result = await runDevSeed({ resetAdmin, demo });
    const password = process.env.ADMIN_SEED_PASSWORD ?? "admin12345";

    console.log("Development seed complete.\n");
    if (result.admin.created) {
      console.log(`Admin created:  ${result.admin.email}`);
    } else if (result.admin.passwordReset) {
      console.log(`Admin password reset:  ${result.admin.email}`);
    } else {
      console.log(`Admin already exists:  ${result.admin.email}  (password unchanged)`);
      console.log("  Re-run with --reset-admin to set ADMIN_SEED_PASSWORD.");
    }
    console.log(`Login:  ${result.admin.email}  /  ${password}`);
    console.log("Admin UI:  http://localhost:3000/admin/login\n");

    if (result.demo) {
      console.log(`Demo userId:  ${result.demo.userId}`);
      for (const reminder of result.demo.reminders) {
        console.log(`  ${reminder.habitId}  →  ${reminder.scheduledTimes.join(", ")}`);
      }
      console.log("Demo reminders are seeded for dashboard data. Mobile APIs use x-api-key + x-fcm-token.");
    }
  } finally {
    await disconnectSeed();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
