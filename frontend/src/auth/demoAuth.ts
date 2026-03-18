export type DemoUser = {
  user_id: string;
  username: string;
  display_name: string | null;
  role: string | null;
  group_id: string | null;
};

const STORAGE_KEY = "demo_user";
const AUTH_EVENT = "demo-user-changed";

function canUseBrowserStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function emitAuthChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_EVENT));
}

export function setDemoUser(user: DemoUser) {
  if (!canUseBrowserStorage()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  emitAuthChange();
}

export function getDemoUser(): DemoUser | null {
  if (!canUseBrowserStorage()) return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DemoUser;
  } catch {
    return null;
  }
}

export function getDemoUserId(): string | null {
  return getDemoUser()?.user_id || null;
}

export function clearDemoUser() {
  if (!canUseBrowserStorage()) return;
  localStorage.removeItem(STORAGE_KEY);
  emitAuthChange();
}

export function subscribeDemoUser(listener: () => void) {
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
