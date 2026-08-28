import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function applyEnvFile(name, overwrite) {
  const file = resolve(process.cwd(), name);
  if (!existsSync(file)) return;
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

applyEnvFile(".env", false);
applyEnvFile(".env.production", true);
applyEnvFile(".env.local", true);

const base = (process.env.CRON_INTERNAL_URL ?? `http://127.0.0.1:${process.env.PORT ?? "3000"}`).replace(
  /\/$/,
  "",
);
const secret = process.env.CRON_SECRET ?? "";
const path = "/api/v1/habits/cron/reminder";

let busy = false;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function msUntilNextMinute() {
  return 60_000 - (Date.now() % 60_000);
}

async function tick() {
  if (busy) {
    console.warn("[cron] skipped overlapping tick");
    return;
  }
  if (!secret) {
    console.error("[cron] CRON_SECRET is missing");
    return;
  }
  busy = true;
  try {
    const response = await fetch(`${base}${path}`, {
      headers: { "x-cron-secret": secret },
    });
    const body = await response.text();
    if (!response.ok) {
      console.error(`[cron] ${response.status} ${body.slice(0, 300)}`);
      return;
    }
    console.log(`[cron] ${body}`);
  } catch (error) {
    console.error("[cron] request failed", error instanceof Error ? error.message : error);
  } finally {
    busy = false;
  }
}

console.log(`[cron] targeting ${base}${path} every minute`);
await sleep(msUntilNextMinute());
for (;;) {
  await tick();
  await sleep(msUntilNextMinute());
}
