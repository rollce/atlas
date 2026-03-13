export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string;
};

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as T & {
    code?: string;
    message?: string;
  };

  if (!response.ok) {
    const message =
      payload?.message ?? `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload;
}
