import { clearAuthUser, getAccessToken } from "../auth/authSession";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

type ApiFetchOptions = RequestInit & {
  skipAuth?: boolean;
};

function handleUnauthorizedResponse() {
  clearAuthUser();

  if (typeof window === "undefined") return;
  if (window.location.pathname === "/login") return;

  const next =
    window.location.pathname +
    window.location.search +
    window.location.hash;
  const target = `/login?next=${encodeURIComponent(next)}`;

  window.location.assign(target);
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { skipAuth = false, headers, ...rest } = options;
  const accessToken = skipAuth ? null : getAccessToken();

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(headers || {}),
    },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401 && !skipAuth) {
      handleUnauthorizedResponse();
    }

    const msg =
      (data && (data.error || data.message)) ||
      `Request failed: ${res.status}`;
    throw new Error(msg);
  }

  return data as T;
}
