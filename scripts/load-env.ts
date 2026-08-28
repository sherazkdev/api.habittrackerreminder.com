import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function applyLine(line: string, overwrite: boolean) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const eq = trimmed.indexOf("=");
  if (eq <= 0) return;
  const key = trimmed.slice(0, eq).trim();
  let value = trimmed.slice(eq + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  if (overwrite || process.env[key] === undefined) {
    process.env[key] = value;
  }
}

export function loadLocalEnv(root = process.cwd()) {
  for (const name of [".env", ".env.production", ".env.local"] as const) {
    const file = resolve(root, name);
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      applyLine(line, name !== ".env");
    }
  }
}
