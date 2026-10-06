/**
 * Final pre-deploy smoke (reads secrets from env only).
 * Usage:
 *   TEST_FCM_TOKEN=... node scripts/final-smoke-run.mjs
 * Requires: .env.local with MONGODB_URI, CRON_SECRET, Firebase, etc.
 * Optional: SMOKE_BASE_URL (default http://127.0.0.1:3012)
 */
import { existsSync, readFileSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import mongoose from "mongoose";

function loadEnv(name) {
  if (!existsSync(name)) return;
  for (const line of readFileSync(name, "utf8").split(/\r?\n/)) {
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
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnv(".env");
loadEnv(".env.local");

const base = (process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:3012").replace(/\/$/, "");
const fcmToken = process.env.TEST_FCM_TOKEN?.trim();
if (!fcmToken) {
  console.error("TEST_FCM_TOKEN env is required");
  process.exit(2);
}

function maskToken(t) {
  if (t.length < 12) return "***";
  return `${t.slice(0, 6)}...${t.slice(-4)}`;
}

function maskKey(k) {
  if (k.length < 12) return "htk_****";
  return `htk_****${k.slice(-4)}`;
}

const results = {};
function set(name, pass) {
  results[name] = pass ? "PASS" : "FAIL";
}

async function req(method, path, headers = {}, body) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 300) };
  }
  return { status: response.status, json };
}

async function createTempApiKey() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI missing");
  await mongoose.connect(uri, { bufferCommands: false });
  const Admin = mongoose.connection.collection("admins");
  const admin = await Admin.findOne({ isActive: true });
  if (!admin) throw new Error("No active admin in DB for temp API key");
  const token = `htk_${randomBytes(24).toString("base64url")}`;
  const prefix = token.slice(0, 12);
  const keyHash = createHash("sha256").update(token).digest("hex");
  const insert = await mongoose.connection.collection("apikeys").insertOne({
    name: `smoke-${Date.now()}`,
    prefix,
    keyHash,
    adminId: String(admin._id),
    isActive: true,
    lastUsedAt: null,
    revokedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return { token, id: insert.insertedId };
}

async function revokeApiKey(id) {
  await mongoose.connection.collection("apikeys").updateOne(
    { _id: id },
    { $set: { isActive: false, revokedAt: new Date(), updatedAt: new Date() } },
  );
}

function karachiClockParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Karachi",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return {
    day: parts.find((p) => p.type === "weekday")?.value ?? "Monday",
    hour: Number(parts.find((p) => p.type === "hour")?.value ?? 0),
    minute: Number(parts.find((p) => p.type === "minute")?.value ?? 0),
  };
}

function karachiTimePlusMinutes(minutes) {
  const { hour, minute } = karachiClockParts();
  let total = hour * 60 + minute + minutes;
  total = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function karachiNowHHmm() {
  const { hour, minute } = karachiClockParts();
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

const installationId = `smoke-${randomBytes(8).toString("hex")}`;
const habitId = `smoke-habit-${Date.now()}`;
let dueTime = "";
let apiKeyId = null;
let apiKey = null;
let cronMeta = { sent: 0, failed: 0, checked: 0, duplicateSuppressed: "NO" };
let fcmMeta = { serverPass: false, payloadType: "habit_reminder" };

try {
  const health = await req("GET", "/health");
  set("Health", health.status === 200);

  const ready = await req("GET", "/ready");
  const readyOk =
    ready.status === 200 &&
    ready.json?.data?.mongo === true &&
    ready.json?.data?.firebase === true &&
    ready.json?.data?.cron === true;
  set("Readiness", readyOk);
  if (!readyOk) throw new Error("Readiness failed — stopping");

  const keyRow = await createTempApiKey();
  apiKey = keyRow.token;
  apiKeyId = keyRow.id;

  const reg1 = await req(
    "POST",
    "/api/v1/devices",
    { "x-api-key": apiKey },
    { fcmToken, timezone: "Asia/Karachi", installationId },
  );
  set("Device registration", reg1.status === 200 && reg1.json?.data?.registered === true);

  const reg2 = await req(
    "POST",
    "/api/v1/devices",
    { "x-api-key": apiKey },
    { fcmToken, timezone: "Asia/Karachi", installationId },
  );
  set("Repeat registration", reg2.status === 200 && reg2.json?.data?.registered === true);

  const badTz = await req(
    "POST",
    "/api/v1/devices",
    { "x-api-key": apiKey },
    { fcmToken, timezone: "Invalid/Test_Timezone", installationId },
  );
  set("Invalid timezone → 400", badTz.status === 400);

  await req(
    "POST",
    "/api/v1/devices",
    { "x-api-key": apiKey },
    { fcmToken, timezone: "Asia/Karachi", installationId },
  );

  const dueTime = karachiNowHHmm();
  const remBody = {
    habitId,
    habitName: "Smoke Test Habit",
    notificationBody: "Smoke reminder",
    days: ["Everyday"],
    timer: true,
    repeat: false,
    time: dueTime,
    timezone: "Asia/Karachi",
  };

  const rem1 = await req(
    "POST",
    "/api/v1/habits/reminder",
    { "x-api-key": apiKey, "x-fcm-token": fcmToken },
    remBody,
  );
  const remOk =
    rem1.status === 200 &&
    rem1.json?.habitId === habitId &&
    rem1.json?.timezoneSource === "reminder";
  set("Reminder creation", remOk);

  const rem2 = await req(
    "POST",
    "/api/v1/habits/reminder",
    { "x-api-key": apiKey, "x-fcm-token": fcmToken },
    remBody,
  );
  set(
    "Duplicate reminder upsert",
    rem2.status === 200 && rem2.json?.habitId === habitId,
  );

  const fcm = await req(
    "POST",
    "/api/admin/fcm/test-notification",
    { "x-api-key": apiKey },
    { fcm_token: fcmToken },
  );
  fcmMeta.serverPass =
    fcm.status === 200 && (fcm.json?.data?.successCount ?? 0) >= 1;
  set("Direct Firebase send", fcmMeta.serverPass);

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    set("Real cron dispatch", false);
    set("Duplicate cron prevention", false);
  } else {
    const cron1 = await req("GET", "/api/v1/habits/cron/reminder", {
      "x-cron-secret": cronSecret,
    });
    const cron1Ok = cron1.status === 200;
    cronMeta.checked = cron1.json?.data?.checked ?? 0;
    cronMeta.sent = cron1.json?.data?.sent ?? 0;
    cronMeta.failed = cron1.json?.data?.failed ?? 0;

    const cron2 = await req("GET", "/api/v1/habits/cron/reminder", {
      "x-cron-secret": cronSecret,
    });
    const sent2 = cron2.json?.data?.sent ?? 0;
    cronMeta.duplicateSuppressed =
      cronMeta.sent >= 1 && sent2 === 0 ? "YES" : cronMeta.sent === 0 ? "N/A (not due)" : "NO";

    set("Real cron dispatch", cron1Ok && cronMeta.sent >= 1);
    set(
      "Duplicate cron prevention",
      cronMeta.duplicateSuppressed === "YES" || cronMeta.sent === 0,
    );
  }

  const badKey = await req(
    "POST",
    "/api/v1/devices",
    { "x-api-key": "htk_invalid_smoke_test" },
    { fcmToken, timezone: "Asia/Karachi", installationId },
  );
  set("Invalid API key → 401", badKey.status === 401);

  const del1 = await req("DELETE", "/api/v1/devices/data", {
    "x-api-key": apiKey,
    "x-fcm-token": fcmToken,
  });
  const del1Ok =
    del1.status === 200 &&
    del1.json?.data?.deletedUser === true &&
    del1.json?.data?.deletedReminders >= 1;
  set("Delete My Data", del1Ok);

  const del2 = await req("DELETE", "/api/v1/devices/data", {
    "x-api-key": apiKey,
    "x-fcm-token": fcmToken,
  });
  const del2Ok =
    del2.status === 200 && del2.json?.data?.alreadyDeleted === true;
  set("Second delete idempotent", del2Ok);

  const User = mongoose.connection.collection("users");
  const Reminder = mongoose.connection.collection("reminders");
  const Delivery = mongoose.connection.collection("notificationdeliveries");
  const user = await User.findOne({ fcmTokens: fcmToken });
  const rem = await Reminder.findOne({ habitId });
  const deliveries = await Delivery.countDocuments({ habitId });
  set("Test-data cleanup", !user && !rem && deliveries === 0);
} catch (error) {
  console.error("SMOKE_ABORT:", error instanceof Error ? error.message : error);
} finally {
  if (apiKeyId) {
    try {
      await revokeApiKey(apiKeyId);
    } catch {
      /* ignore */
    }
  }
  if (mongoose.connection.readyState === 1) await mongoose.disconnect();
}

console.log("ENVIRONMENT: LOCAL");
console.log("API_BASE:", base);
console.log("FCM_MASK:", maskToken(fcmToken));
console.log("API_KEY_MASK:", apiKey ? maskKey(apiKey) : "n/a");
console.log("INSTALLATION_ID:", installationId);
console.log("HABIT_ID:", habitId);
console.log("DUE_TIME_KARACHI:", dueTime);
console.log("FCM_SERVER:", fcmMeta.serverPass ? "PASS" : "FAIL");
console.log("CRON_META:", JSON.stringify(cronMeta));
console.log("RESULTS:", JSON.stringify(results, null, 2));

const failed = Object.values(results).some((v) => v === "FAIL");
process.exit(failed ? 1 : 0);
