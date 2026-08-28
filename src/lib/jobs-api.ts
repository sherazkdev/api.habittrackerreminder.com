import { API_BASE_URL } from "@/lib/api-config";
import { apiGet, apiPost, apiUpload } from "@/lib/api-client";

export type DataJobStatus = "queued" | "processing" | "completed" | "failed" | "cancelled";

export type DataJobApi = {
  id: number;
  type: "import" | "export" | "raw";
  resource: string;
  status: DataJobStatus;
  progress: number;
  processed: number;
  successful: number;
  failed: number;
  fileKey: string | null;
  resultFileKey: string | null;
  downloadUrl: string | null;
  errorSummary: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

export async function fetchJob(id: number): Promise<DataJobApi> {
  return apiGet<DataJobApi>(`/api/admin/jobs/${id}`);
}

export async function fetchJobs(): Promise<DataJobApi[]> {
  const data = await apiGet<{ items: DataJobApi[] }>("/api/admin/jobs");
  return data.items;
}

export async function fetchExportPreview(payload: {
  resource: string;
  filters: ExportFiltersApi;
}) {
  return apiPost<{ total: number; resource: string }>("/api/admin/jobs/export-preview", payload);
}

export type ExportFiltersApi = {
  scope: "all" | "active" | "inactive" | "challenge";
  gender: "all" | "male" | "female" | "both";
  categoryId: number | null;
  workoutLevelId: number | null;
  workoutCategoryId: number | null;
};

export async function queueExportCsv(payload: {
  resource: string;
  columns: Array<{ key: string; label: string }>;
  filters: ExportFiltersApi;
}) {
  return apiPost<DataJobApi & { message: string }>("/api/admin/jobs/export-csv", payload);
}

export async function queueRawImport(payload: { resource: string; payload: string }) {
  return apiPost<DataJobApi & { message: string }>("/api/admin/jobs/raw-import", payload);
}

export async function queueImportCsv(
  resource: string,
  file: File,
  options: { hasHeaders: boolean; skipInvalid: boolean },
): Promise<DataJobApi & { message: string }> {
  return apiUpload<DataJobApi & { message: string }>("/api/admin/jobs/import-csv", file, {
    resource,
    hasHeaders: String(options.hasHeaders),
    skipInvalid: String(options.skipInvalid),
  });
}

export function jobDownloadUrl(jobId: number): string {
  return `${API_BASE_URL}/api/admin/jobs/${jobId}/download`;
}

export function isJobFinished(job: Pick<DataJobApi, "status">) {
  return job.status === "completed" || job.status === "failed" || job.status === "cancelled";
}

export async function pollJobUntilDone(
  jobId: number,
  onProgress?: (job: DataJobApi) => void,
): Promise<DataJobApi> {
  const started = Date.now();
  while (Date.now() - started < 180_000) {
    const job = await fetchJob(jobId);
    onProgress?.(job);
    if (isJobFinished(job)) {
      return job;
    }
    await new Promise((resolve) => setTimeout(resolve, 800));
  }
  throw new Error("This is taking too long. Refresh the page and try again.");
}

export async function settleJob(
  job: DataJobApi,
  onProgress?: (job: DataJobApi) => void,
): Promise<DataJobApi> {
  onProgress?.(job);
  if (isJobFinished(job)) {
    return job;
  }
  return pollJobUntilDone(job.id, onProgress);
}
