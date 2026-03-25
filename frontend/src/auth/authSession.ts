export type AuthUser = {
  user_id: string;
  username: string;
  display_name: string | null;
  role: string | null;
  email?: string | null;
  group_id: string | null;
};

export type AuthTokens = {
  access_token: string;
  refresh_token: string;
  expires_at: number | null;
};

export type AuthState = {
  user: AuthUser;
  session: AuthTokens | null;
};

const STORAGE_KEY = "auth_user";
const AUTH_EVENT = "auth-user-changed";

// guards against running in SSR / non-browser environments
function canUseBrowserStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function emitAuthChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_EVENT));
}

function normalizeAuthUser(user: AuthUser): AuthUser {
  return {
    ...user,
    email: user.email ?? null,
    group_id: user.group_id ?? null,
  };
}

// handles both old format (bare AuthUser) and new format ({ user, session })
// kept backwards compat so old stored sessions don't break on refresh
function parseStoredAuthState(raw: string): AuthState | null {
  try {
    const parsed = JSON.parse(raw) as AuthState | AuthUser;
    if (!parsed || typeof parsed !== "object") return null;

    if ("user" in parsed) {
      if (!parsed.user) return null;
      return {
        ...(parsed as AuthState),
        user: normalizeAuthUser(parsed.user as AuthUser),
      };
    }

    return {
      user: normalizeAuthUser(parsed as AuthUser),
      session: null,
    };
  } catch {
    return null;
  }
}

export function setAuthState(state: AuthState) {
  if (!canUseBrowserStorage()) return;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...state,
      user: normalizeAuthUser(state.user),
    })
  );
  emitAuthChange();
}

export function setAuthUser(user: AuthUser) {
  const current = getAuthState();
  setAuthState({
    user,
    session: current?.session ?? null,
  });
}

export function getAuthState(): AuthState | null {
  if (!canUseBrowserStorage()) return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  return parseStoredAuthState(raw);
}

export function getAuthUser(): AuthUser | null {
  return getAuthState()?.user ?? null;
}

export function getAuthUserId(): string | null {
  return getAuthUser()?.user_id || null;
}

export function getAccessToken(): string | null {
  return getAuthState()?.session?.access_token ?? null;
}

export function getRefreshToken(): string | null {
  return getAuthState()?.session?.refresh_token ?? null;
}

export function clearAuthUser() {
  if (!canUseBrowserStorage()) return;
  localStorage.removeItem(STORAGE_KEY);
  emitAuthChange();
}

export function subscribeAuthUser(listener: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      listener();
    }
  };

  const handleAuthChange = () => {
    listener();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(AUTH_EVENT, handleAuthChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(AUTH_EVENT, handleAuthChange);
  };
}
