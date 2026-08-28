import { apiDelete, apiGet, apiPost, refreshAccessToken } from "@/lib/api-client";

export type ApiKeyItem = {
  id: string;
  name: string;
  prefix: string;
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

export type ApiKeyCreated = {
  id: string;
  name: string;
  prefix: string;
  token: string;
  createdAt: string;
};

export { refreshAccessToken };

export async function fetchApiKeys() {
  return apiGet<{ items: ApiKeyItem[] }>("/api/admin/api-keys");
}

export async function createApiKey(name: string) {
  return apiPost<ApiKeyCreated>("/api/admin/api-keys", { name });
}

export async function revokeApiKey(id: string) {
  return apiDelete<{ id: string; revoked: true }>(`/api/admin/api-keys/${id}`);
}
