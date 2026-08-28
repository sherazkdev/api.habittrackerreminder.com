export type ValidationState = "valid" | "warning" | "invalid";

export type CsvPreviewRow = {
  row: number;
  values: string[];
  validation: ValidationState;
};

export type CsvPreview = {
  columns: string[];
  rows: CsvPreviewRow[];
  fileName: string;
  fileSize: string;
};

export type RawPreviewRow = {
  values: string[];
  validation: ValidationState;
};

export type RawPreview = {
  detected: number;
  valid: number;
  invalid: number;
  columns: string[];
  rows: RawPreviewRow[];
};
