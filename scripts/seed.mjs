import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

function loadEnv() {
  for (const name of [".env", ".env.production", ".env.local"]) {
    const file = resolve(process.cwd(), name);
    if (!existsSync(file)) continue;
    const overwrite = name !== ".env";
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (overwrite || process.env[key] === undefined) process.env[key] = value;
    }
  }
}

function timeToMinutes(value) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(total) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function computeScheduledTimes(input) {
  if (input.timer && input.time) return [input.time];
  const start = input.startTime ?? "00:00";
  const count = input.repeatCount ?? 1;
  if (count <= 1) return [start];
  const startMins = timeToMinutes(start);
  const endMins = timeToMinutes(input.endTime ?? start);
  const gap = (endMins - startMins) / (count - 1);
  return Array.from({ length: count }, (_, index) =>
    minutesToTime(Math.round(startMins + gap * index)),
  );
}

const AdminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    tokenVersion: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const ReminderSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    habitId: { type: String, required: true },
    habitName: { type: String, required: true },
    notificationBody: { type: String, required: true },
    days: [{ type: String, required: true }],
    timer: { type: Boolean, required: true },
    repeat: { type: Boolean, required: true },
    time: String,
    startTime: String,
    endTime: String,
    repeatCount: Number,
    scheduledTimes: [{ type: String, required: true }],
  },
  { timestamps: true },
);

ReminderSchema.index({ userId: 1, habitId: 1 }, { unique: true });

const Admin = mongoose.models.Admin ?? mongoose.model("Admin", AdminSchema);
const Reminder = mongoose.models.Reminder ?? mongoose.model("Reminder", ReminderSchema);

const DEMO_USER_ID = "seed-dev-user";
const DEMO_REMINDERS = [
  {
    habitId: "abc123",
    habitName: "Drink Water",
    notificationBody: "Time for your habit",
    days: ["Everyday"],
    timer: true,
    repeat: false,
    time: "08:00",
  },
  {
    habitId: "xyz789",
    habitName: "Stretch",
    notificationBody: "Time for your habit",
    days: ["Monday", "Wednesday", "Friday"],
    timer: false,
    repeat: true,
    startTime: "09:00",
    endTime: "21:00",
    repeatCount: 4,
  },
];

async function upsertReminder(userId, payload) {
  const scheduledTimes = computeScheduledTimes(payload);
  const doc = await Reminder.findOneAndUpdate(
    { userId, habitId: payload.habitId },
    { ...payload, userId, scheduledTimes },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return { habitId: doc.habitId, scheduledTimes: doc.scheduledTimes };
}

loadEnv();

const resetAdmin = process.argv.includes("--reset-admin");
const demo = !process.argv.includes("--no-demo");
const allowProd = process.env.ALLOW_PROD_SEED === "true";

if (process.env.NODE_ENV === "production" && !allowProd) {
  console.error("Production seed blocked. Run: ALLOW_PROD_SEED=true npm run seed");
  process.exit(1);
}

if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI missing in .env.local");
  process.exit(1);
}

const email = (process.env.ADMIN_SEED_EMAIL ?? "admin@habittracker.local").toLowerCase();
const name = process.env.ADMIN_SEED_NAME ?? "Admin";
const password = process.env.ADMIN_SEED_PASSWORD ?? "admin12345";
const adminUrl = process.env.ADMIN_PUBLIC_URL ?? "http://localhost:3000";

try {
  await mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false });

  const existing = await Admin.findOne({ email });
  let created = false;
  let passwordReset = false;

  if (!existing) {
    await Admin.create({
      name,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      tokenVersion: 0,
      isActive: true,
    });
    created = true;
  } else if (resetAdmin) {
    existing.name = name;
    existing.passwordHash = await bcrypt.hash(password, 12);
    existing.tokenVersion += 1;
    existing.isActive = true;
    await existing.save();
    passwordReset = true;
  }

  console.log("Seed complete.\n");
  if (created) console.log(`Admin created:  ${email}`);
  else if (passwordReset) console.log(`Admin password reset:  ${email}`);
  else {
    console.log(`Admin already exists:  ${email}  (password unchanged)`);
    console.log("  Re-run with --reset-admin to apply ADMIN_SEED_PASSWORD.");
  }
  console.log(`Login:  ${email}  /  ${password}`);
  console.log(`Admin:  ${adminUrl.replace(/\/$/, "")}/admin/login\n`);

  if (demo) {
    const reminders = [];
    for (const payload of DEMO_REMINDERS) {
      reminders.push(await upsertReminder(DEMO_USER_ID, payload));
    }
    console.log(`Demo userId:  ${DEMO_USER_ID}`);
    for (const reminder of reminders) {
      console.log(`  ${reminder.habitId}  →  ${reminder.scheduledTimes.join(", ")}`);
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await mongoose.disconnect();
}
