import type { DataResourceId } from "@/lib/data-resources";
import { apiPost } from "@/lib/api-client";

export type RawUploadResult = {
  resource: DataResourceId;
  inserted: number;
  updated: number;
  failed: number;
  saved: number;
  errors: { index: number; message: string }[];
};

export async function uploadRawRecords(
  resource: DataResourceId,
  payload: string,
): Promise<RawUploadResult> {
  return apiPost<RawUploadResult>("/api/admin/raw-upload", {
    resource,
    payload,
  });
}
