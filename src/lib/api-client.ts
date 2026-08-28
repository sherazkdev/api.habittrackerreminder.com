import { API_BASE_URL } from "@/lib/api-config";
import { getAccessToken, redirectToAdminLogin, setAccessToken } from "@/lib/auth-session";

type ApiSuccess<T> = {
  success: true;
  data: T;
};

type ApiFailure = {
  success: false;
  error: {
    code: string;
    message: string;
  };
  requestId?: string;
};

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

type RequestOptions = {
  auth?: boolean;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
};

const REFRESH_PATH = "/api/admin/refresh";

export type RefreshSession = {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
};

async function parseResponse<T>(response: Response): Promise<T> {
  let json: ApiSuccess<T> | ApiFailure;
  try {
    json = (await response.json()) as ApiSuccess<T> | ApiFailure;
  } catch {
    throw new ApiError(
      "INVALID_RESPONSE",
      `Server returned an unexpected response (${response.status}).`,
      response.status,
    );
  }

  if (!json.success) {
    throw new ApiError(json.error.code, json.error.message, response.status);
  }

  return json.data;
}

function authHeaders(useAuth: boolean): HeadersInit {
  const token = useAuth ? getAccessToken() : null;
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function refreshAccessToken(): Promise<RefreshSession> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${REFRESH_PATH}`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    throw new ApiError(
      "NETWORK_ERROR",
      `Cannot reach API${API_BASE_URL ? ` at ${API_BASE_URL}` : ""}. Start the dev server with: npm run dev`,
      0,
    );
  }

  return parseResponse<RefreshSession>(response);
}

let refreshInFlight: Promise<boolean> | null = null;

async function refreshSessionOnce(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const session = await refreshAccessToken();
        setAccessToken(session.accessToken);
        return true;
      } catch {
        return false;
      }
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

function endSession(): never {
  redirectToAdminLogin();
  throw new ApiError("UNAUTHORIZED", "Session expired or not logged in. Please sign in again.", 401);
}

async function send(
  path: string,
  init: {
    method: string;
    headers: HeadersInit;
    body?: BodyInit;
  },
): Promise<Response> {
  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      method: init.method,
      credentials: "include",
      headers: init.headers,
      body: init.body,
    });
  } catch {
    throw new ApiError(
      "NETWORK_ERROR",
      `Cannot reach API${API_BASE_URL ? ` at ${API_BASE_URL}` : ""}. Start the dev server with: npm run dev`,
      0,
    );
  }
}

async function withAuthRetry(path: string, useAuth: boolean, execute: () => Promise<Response>): Promise<Response> {
  let response = await execute();
  if (!useAuth || response.status !== 401 || path === REFRESH_PATH) {
    return response;
  }

  const refreshed = await refreshSessionOnce();
  if (!refreshed) {
    endSession();
  }

  response = await execute();
  if (response.status === 401) {
    endSession();
  }
  return response;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const useAuth = options.auth ?? true;
  const method = options.method ?? (options.body !== undefined ? "POST" : "GET");

  const response = await withAuthRetry(path, useAuth, () =>
    send(path, {
      method,
      headers: {
        ...authHeaders(useAuth),
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    }),
  );

  if (useAuth && response.status === 401) {
    endSession();
  }

  return parseResponse<T>(response);
}

export async function apiGet<T>(path: string, options?: { auth?: boolean }): Promise<T> {
  return apiRequest<T>(path, { ...options, method: "GET" });
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  options?: { auth?: boolean },
): Promise<T> {
  return apiRequest<T>(path, { ...options, method: "POST", body });
}

export async function apiPut<T>(
  path: string,
  body: unknown,
  options?: { auth?: boolean },
): Promise<T> {
  return apiRequest<T>(path, { ...options, method: "PUT", body });
}

export async function apiDelete<T>(path: string, options?: { auth?: boolean }): Promise<T> {
  return apiRequest<T>(path, { ...options, method: "DELETE" });
}

export async function apiPatch<T>(
  path: string,
  body: unknown,
  options?: { auth?: boolean },
): Promise<T> {
  return apiRequest<T>(path, { ...options, method: "PATCH", body });
}

export async function apiUpload<T>(
  path: string,
  file: File,
  fields?: Record<string, string>,
): Promise<T> {
  const response = await withAuthRetry(path, true, () => {
    const formData = new FormData();
    formData.append("file", file);
    if (fields) {
      for (const [key, value] of Object.entries(fields)) {
        formData.append(key, value);
      }
    }
    return send(path, {
      method: "POST",
      headers: authHeaders(true),
      body: formData,
    });
  });

  if (response.status === 401) {
    endSession();
  }

  return parseResponse<T>(response);
}
