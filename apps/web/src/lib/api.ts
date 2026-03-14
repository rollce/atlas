const viteApiUrl =
  (import.meta.env.VITE_API_URL as string | undefined) ?? undefined;
const legacyApiUrl =
  (import.meta.env.NEXT_PUBLIC_API_URL as string | undefined) ?? undefined;

export const API_BASE =
  viteApiUrl ?? legacyApiUrl ?? "http://localhost:4000/api/v1";

export type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string;
  organizationId?: string;
  signal?: AbortSignal;
  headers?: Record<string, string>;
};

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(params: { status: number; message: string; code?: string }) {
    super(params.message);
    this.status = params.status;
    this.code = params.code;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const response = await fetch(`${API_BASE}${normalizedPath}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.organizationId
        ? { "x-organization-id": options.organizationId }
        : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
    signal: options.signal,
  });

  const payload = (await response.json().catch(() => null)) as T & {
    code?: string;
    message?: string;
  };

  if (!response.ok) {
    const message =
      payload?.message ?? `Request failed with status ${response.status}`;
    throw new ApiError({
      status: response.status,
      code: payload?.code,
      message,
    });
  }

  return payload;
}
