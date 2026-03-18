const ACCESSIBILITY_SETTINGS_STORAGE_KEY = "campus-carbon-accessibility-settings";
const ACCESSIBILITY_SETTINGS_EVENT = "campus-carbon-accessibility-settings-change";

export type AccessibilitySettings = {
  enabled: boolean;
  boldText: boolean;
};

const defaultAccessibilitySettings: AccessibilitySettings = {
  enabled: false,
  boldText: false,
};

function normalizeAccessibilitySettings(value: unknown): AccessibilitySettings {
  if (!value || typeof value !== "object") return defaultAccessibilitySettings;

  const settings = value as Partial<AccessibilitySettings>;
  return {
    enabled: Boolean(settings.enabled),
    boldText: Boolean(settings.boldText),
  };
}

export function getAccessibilitySettings() {
  if (typeof window === "undefined") return defaultAccessibilitySettings;

  const raw = window.localStorage.getItem(ACCESSIBILITY_SETTINGS_STORAGE_KEY);
  if (!raw) return defaultAccessibilitySettings;

  try {
    return normalizeAccessibilitySettings(JSON.parse(raw));
  } catch {
    return defaultAccessibilitySettings;
  }
}

export function setAccessibilitySettings(settings: AccessibilitySettings) {
  if (typeof window === "undefined") return;

  const nextSettings = normalizeAccessibilitySettings(settings);
  window.localStorage.setItem(
    ACCESSIBILITY_SETTINGS_STORAGE_KEY,
    JSON.stringify(nextSettings)
  );
  window.dispatchEvent(
    new CustomEvent(ACCESSIBILITY_SETTINGS_EVENT, { detail: nextSettings })
  );
}

export function subscribeToAccessibilitySettings(
  callback: (settings: AccessibilitySettings) => void
) {
  if (typeof window === "undefined") return () => {};

  function handleCustomEvent(event: Event) {
    const customEvent = event as CustomEvent<AccessibilitySettings>;
    callback(normalizeAccessibilitySettings(customEvent.detail));
  }

  function handleStorageEvent(event: StorageEvent) {
    if (event.key !== ACCESSIBILITY_SETTINGS_STORAGE_KEY) return;
    if (!event.newValue) {
      callback(defaultAccessibilitySettings);
      return;
    }

    try {
      callback(normalizeAccessibilitySettings(JSON.parse(event.newValue)));
    } catch {
      callback(defaultAccessibilitySettings);
    }
  }

  window.addEventListener(
    ACCESSIBILITY_SETTINGS_EVENT,
    handleCustomEvent as EventListener
  );
  window.addEventListener("storage", handleStorageEvent);

  return () => {
    window.removeEventListener(
      ACCESSIBILITY_SETTINGS_EVENT,
      handleCustomEvent as EventListener
    );
    window.removeEventListener("storage", handleStorageEvent);
  };
}
