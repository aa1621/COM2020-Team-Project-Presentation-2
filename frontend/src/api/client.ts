import { getDemoUserId } from "../auth/demoAuth";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

type ApiFetchOptions = RequestInit & {
  skipAuth?: boolean;
};

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { skipAuth = false, headers, ...rest } = options;
  const userId = skipAuth ? null : getDemoUserId();

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { "x-user-id": userId } : {}),
      ...(headers || {}),
    },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const msg =
      (data && (data.error || data.message)) ||
      `Request failed: ${res.status}`;
    throw new Error(msg);
  }

  return data as T;
}
