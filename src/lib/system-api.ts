import { apiGet } from "@/lib/api-client";

export type SystemDependencyStatus = {
  ok: boolean;
  latencyMs: number;
  error?: string;
};

export type SystemStatusApi = {
  status: "healthy" | "degraded";
  checkedAt: string;
  api: {
    name: string;
    version: string;
    nodeEnv: string;
    uptimeSeconds: number;
    publicUrl: string;
    adminUrl: string;
  };
  dependencies: {
    mongo: SystemDependencyStatus;
    firebase: SystemDependencyStatus;
  };
  reminders: {
    cronEnabled: boolean;
  };
  features: {
    fcmEnabled: boolean;
  };
};

export async function fetchSystemStatus(): Promise<SystemStatusApi> {
  return apiGet<SystemStatusApi>("/api/admin/system");
}
