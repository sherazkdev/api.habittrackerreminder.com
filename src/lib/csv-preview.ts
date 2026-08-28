import type { ValidationState } from "@/lib/data-preview-types";

export type ParsedCsvPreview = {
  columns: string[];
  rows: Array<{ row: number; values: string[]; validation: ValidationState }>;
};

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  values.push(current.trim());
  return values;
}

function validatePreviewRow(resource: string, values: string[], headers: string[]): "valid" | "invalid" {
  const index = (name: string) =>
    headers.findIndex((header) => header.toLowerCase().replace(/[^a-z0-9]+/g, "_") === name);
  const titleIdx = index("title");
  const nameIdx = index("name");
  if (resource === "meals" || resource === "exercises") {
    const value = values[titleIdx >= 0 ? titleIdx : -1]?.trim();
    return value ? "valid" : "invalid";
  }
  const value = values[nameIdx >= 0 ? nameIdx : titleIdx]?.trim();
  return value ? "valid" : "invalid";
}

export function parseCsvPreview(
  text: string,
  hasHeaders = true,
  resource = "meals",
): ParsedCsvPreview {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { columns: [], rows: [] };
  }

  const parsed = lines.map(parseCsvLine);
  const columns = hasHeaders ? (parsed[0] ?? []) : parsed[0]?.map((_, index) => `Column ${index + 1}`) ?? [];
  const dataRows = hasHeaders ? parsed.slice(1) : parsed;

  return {
    columns,
    rows: dataRows.map((values, index) => ({
      row: index + 1,
      values,
      validation: validatePreviewRow(resource, values, columns),
    })),
  };
}
