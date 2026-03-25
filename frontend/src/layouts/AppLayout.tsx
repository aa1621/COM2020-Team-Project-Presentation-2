import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import {
  getAccessibilitySettings,
  setAccessibilitySettings,
  subscribeToAccessibilitySettings,
  type AccessibilitySettings,
} from "../accessibility/accessibilityMode";
import Sidebar from "../components/Sidebar";

export default function AppLayout() {
  const { pathname } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accessibilitySettings, setAccessibilitySettingsState] = useState<AccessibilitySettings>(() =>
    getAccessibilitySettings()
  );
  const mainRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      mainRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    document.documentElement.dataset.accessibilityMode = accessibilitySettings.enabled
      ? "true"
      : "false";
    document.documentElement.dataset.darkMode = accessibilitySettings.darkMode
      ? "true"
      : "false";
    document.documentElement.dataset.accessibilityBoldText =
      accessibilitySettings.enabled && accessibilitySettings.boldText
      ? "true"
      : "false";
    document.documentElement.dataset.reducedMotion = accessibilitySettings.reducedMotion
      ? "true"
      : "false";
    document.documentElement.dataset.compactLayout = accessibilitySettings.compactLayout
      ? "true"
      : "false";
    document.documentElement.style.colorScheme = accessibilitySettings.darkMode
      ? "dark"
      : "light";
  }, [accessibilitySettings]);

  useEffect(
    () => subscribeToAccessibilitySettings(setAccessibilitySettingsState),
    []
  );

  return (
    <div className="min-h-screen px-4 py-4 sm:px-6 sm:py-6">
      <a href="#primary-navigation" className="app-skip-link">
        Skip to navigation
      </a>
      <a href="#main-content" className="app-skip-link">
        Skip to main content
      </a>
      <div className="mx-auto max-w-7xl">
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen((open) => !open)}
          accessibilitySettings={accessibilitySettings}
          onToggleAccessibilityMode={() =>
            setAccessibilitySettings({
              ...accessibilitySettings,
              enabled: !accessibilitySettings.enabled,
            })
          }
        />

        <main
          id="main-content"
          ref={mainRef}
          tabIndex={-1}
          className="min-w-0 pl-14 sm:pl-20"
        >
          <div className="app-card mb-5 px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-[rgb(var(--app-ink))]">Campus Carbon</div>
              <div className="text-xs app-muted">Climate actions, challenges, and pet progress</div>
            </div>
          </div>

          <div className="space-y-7">
            <Outlet
              context={{
                accessibilitySettings,
                setAccessibilitySettings,
              }}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
