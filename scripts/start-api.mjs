import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const cwd = process.cwd();
const require = createRequire(resolve(cwd, "package.json"));
const host = process.env.HOST ?? "127.0.0.1";
const port = process.env.PORT ?? "3012";
const nextBin = resolve(cwd, "node_modules/next/dist/bin/next");
const waitMs = Number(process.env.START_WAIT_MS ?? 10 * 60 * 1000);
const pollMs = 2_000;

const requiredFiles = [
  nextBin,
  resolve(cwd, "node_modules/next/dist/cli/next-test.js"),
  resolve(cwd, "node_modules/zod/package.json"),
  resolve(cwd, ".next/BUILD_ID"),
];

const runtimePackages = ["next", "zod", "mongoose", "firebase-admin"];

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function unresolvedPackages() {
  return runtimePackages.filter((name) => {
    try {
      require.resolve(name);
      return false;
    } catch {
      return true;
    }
  });
}

function missingFiles() {
  return requiredFiles.filter((file) => !existsSync(file));
}

function installReady() {
  return missingFiles().length === 0 && unresolvedPackages().length === 0;
}

function notReadyReason() {
  const files = missingFiles();
  const packages = unresolvedPackages();
  return [...files, ...packages].join(", ") || "unknown";
}

async function waitUntilReady() {
  if (installReady()) return;
  const deadline = Date.now() + waitMs;
  console.warn(
    `[start-api] production files not ready (${notReadyReason()}). Waiting up to ${Math.round(waitMs / 1000)}s — do not npm ci while this process is live; use deploy/update.sh.`,
  );
  while (!installReady()) {
    if (Date.now() > deadline) {
      throw new Error(
        `[start-api] Timed out waiting for production files. Missing: ${notReadyReason()}. Run: npm ci && npm run build`,
      );
    }
    await sleep(pollMs);
  }
  console.log("[start-api] Next.js is ready, starting.");
}

let child = null;

function shutdown(signal) {
  if (child) child.kill(signal);
  else process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

try {
  await waitUntilReady();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

child = spawn(process.execPath, [nextBin, "start", "-H", host, "-p", String(port)], {
  stdio: "inherit",
  cwd,
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (!installReady()) {
    console.error(
      "[start-api] Next.js files disappeared during a live npm install. Exiting so PM2 can retry after deploy/update.sh.",
    );
    process.exit(1);
  }
  if (signal) process.exit(1);
  process.exit(code ?? 1);
});
