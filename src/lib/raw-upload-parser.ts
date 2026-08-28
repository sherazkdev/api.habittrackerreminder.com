import type { DataResourceId } from "@/lib/data-resources";
import type { RawPreview, RawPreviewRow, ValidationState } from "@/lib/data-preview-types";

export type RawParseResult =
  | { ok: true; preview: RawPreview; sourceText: string }
  | { ok: false; error: string };

const PREVIEW_COLUMNS: Record<DataResourceId, string[]> = {
  "meal-categories": ["ID", "Name", "Slug", "Active"],
  meals: ["ID", "Title", "Categories", "Gender", "Active"],
  "workout-levels": ["ID", "Name", "Slug", "Active"],
  "workout-categories": ["ID", "Name", "Levels", "Gender", "Active"],
  exercises: ["ID", "Title", "Slug", "Levels", "Active"],
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function extractRecords(parsed: unknown): unknown[] | null {
  if (Array.isArray(parsed)) return parsed;
  const record = asRecord(parsed);
  if (!record) return null;
  if (Array.isArray(record.records)) return record.records;
  if (Array.isArray(record.data)) return record.data;
  if (Array.isArray(record.items)) return record.items;
  return null;
}

function validateRecord(resource: DataResourceId, item: unknown): ValidationState {
  const row = asRecord(item);
  if (!row) return "invalid";

  switch (resource) {
    case "meal-categories":
    case "workout-levels":
      return typeof row.name === "string" && typeof row.slug === "string" ? "valid" : "warning";
    case "workout-categories":
      return typeof row.name === "string" &&
        typeof row.slug === "string" &&
        Array.isArray(row.levelIds) &&
        row.levelIds.length > 0
        ? "valid"
        : "warning";
    case "meals":
      return typeof row.title === "string" &&
        Array.isArray(row.categoryIds) &&
        row.categoryIds.length > 0
        ? "valid"
        : "warning";
    case "exercises":
      return typeof row.title === "string" &&
        typeof row.slug === "string" &&
        Array.isArray(row.levelIds) &&
        row.levelIds.length > 0
        ? "valid"
        : "warning";
    default:
      return "invalid";
  }
}

function rowValues(resource: DataResourceId, item: unknown): string[] {
  const row = asRecord(item);
  if (!row) return ["—", "—", "—", "—"];

  switch (resource) {
    case "meal-categories":
    case "workout-levels":
      return [
        String(row.id ?? "—"),
        String(row.name ?? "—"),
        String(row.slug ?? "—"),
        String(row.isActive ?? "—"),
      ];
    case "workout-categories":
      return [
        String(row.id ?? "—"),
        String(row.name ?? "—"),
        Array.isArray(row.levelIds) ? row.levelIds.join(", ") : "—",
        String(row.gender ?? "—"),
        String(row.isActive ?? "—"),
      ];
    case "meals":
      return [
        String(row.id ?? "—"),
        String(row.title ?? "—"),
        Array.isArray(row.categoryIds) ? row.categoryIds.join(", ") : "—",
        String(row.gender ?? "—"),
        String(row.isActive ?? "—"),
      ];
    case "exercises":
      return [
        String(row.id ?? "—"),
        String(row.title ?? "—"),
        String(row.slug ?? "—"),
        Array.isArray(row.levelIds) ? row.levelIds.join(", ") : "—",
        String(row.isActive ?? "—"),
      ];
    default:
      return ["—"];
  }
}

export function parseRawUploadInput(resource: DataResourceId, sourceText: string): RawParseResult {
  const trimmed = sourceText.trim();
  if (!trimmed) {
    return { ok: false, error: "Paste JSON or select a file first." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: "Invalid JSON. Use an array of records or { \"records\": [...] }." };
  }

  const records = extractRecords(parsed);
  if (!records) {
    return {
      ok: false,
      error: "JSON must be an array, or an object with a records/data/items array.",
    };
  }

  if (records.length === 0) {
    return { ok: false, error: "No records found in JSON." };
  }

  const columns = PREVIEW_COLUMNS[resource];
  const rows: RawPreviewRow[] = records.map((item) => ({
    values: rowValues(resource, item),
    validation: validateRecord(resource, item),
  }));

  const valid = rows.filter((row) => row.validation === "valid").length;
  const invalid = rows.filter((row) => row.validation === "invalid").length;

  return {
    ok: true,
    sourceText: trimmed,
    preview: {
      detected: records.length,
      valid,
      invalid,
      columns,
      rows,
    },
  };
}
