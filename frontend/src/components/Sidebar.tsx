import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import type { AccessibilitySettings } from "../accessibility/accessibilityMode";
import { logout } from "../api/auth";
import challengeIcon from "../assets/challenge icon.png";
import dashboardIcon from "../assets/dashboard icon.png";
import groupIcon from "../assets/group icon.png";
import leaderboardIcon from "../assets/leaderboard icon.png";
import logIcon from "../assets/log icon.png";
import moderationIcon from "../assets/moderation icon.png";
import petIcon from "../assets/pet icon.png";
import profileIcon from "../assets/profile icon.png";
import shopIcon from "../assets/shop icon.png";

type NavItem = {
  label: string;
  href: string;
  short: string;
  icon: "dashboard" | "pets" | "shop" | "groups" | "challenges" | "log" | "leaderboards" | "profile" | "moderation";
};

const baseNavItems: NavItem[] = [
  { label: "Dashboard", href: "/app/dashboard", short: "DB", icon: "dashboard" },
  { label: "Pets", href: "/app/pets", short: "PT", icon: "pets" },
  { label: "Shop", href: "/app/shop", short: "SH", icon: "shop" },
  { label: "Groups", href: "/app/groups", short: "GR", icon: "groups" },
  { label: "Challenges", href: "/app/challenges", short: "CH", icon: "challenges" },
  { label: "Log action", href: "/app/log-action", short: "LG", icon: "log" },
  { label: "Leaderboards", href: "/app/leaderboards", short: "LB", icon: "leaderboards" },
  { label: "Profile / Settings", href: "/app/profile", short: "PF", icon: "profile" },
];

const navIconSrc: Record<NavItem["icon"], string> = {
  dashboard: dashboardIcon,
  pets: petIcon,
  shop: shopIcon,
  groups: groupIcon,
  challenges: challengeIcon,
  log: logIcon,
  leaderboards: leaderboardIcon,
  profile: profileIcon,
  moderation: moderationIcon,
};

function NavBadge({ item }: { item: NavItem }) {
  return (
    <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-current/10 bg-current/5">
      <img src={navIconSrc[item.icon]} alt="" className="h-5 w-5 object-contain" aria-hidden="true" />
    </span>
  );
}

export default function Sidebar({
  isOpen,
  onToggle,
  accessibilitySettings,
  onToggleAccessibilityMode,
}: {
  isOpen: boolean;
  onToggle: () => void;
  accessibilitySettings: AccessibilitySettings;
  onToggleAccessibilityMode: () => void;
}) {
  const { clearUser, user } = useAuth();
  const canModerate = user?.role === "moderator" || user?.role === "maintainer";
  // mods get an extra item slotted in before "log action"
  const navItems: NavItem[] = canModerate
    ? [
        ...baseNavItems.slice(0, 5),
        { label: "Moderation", href: "/app/moderation", short: "MD", icon: "moderation" },
        ...baseNavItems.slice(5),
      ]
    : baseNavItems;

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // still clear local state even if the server call blips - don't leave the user stuck
    } finally {
      clearUser();
      window.location.href = "/login";
    }
  }

  const accessibilityMode = accessibilitySettings.enabled;

  return (
    <aside
      id="primary-navigation"
      className={`fixed left-4 top-4 z-50 transition-[width] duration-300 ease-out sm:left-6 sm:top-6 ${
        isOpen ? "w-[min(22rem,calc(100vw-2rem))]" : "w-14 sm:w-16"
      }`}
      aria-label="Primary navigation"
    >
      <div className="app-card flex max-h-[calc(100vh-2rem)] min-h-[3.5rem] flex-col overflow-hidden p-3 sm:max-h-[calc(100vh-3rem)] sm:p-4">
        <div className={`flex items-center ${isOpen ? "justify-between gap-3" : "justify-center"}`}>
          <button
            type="button"
            onClick={onToggle}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[rgb(var(--app-line))] bg-white text-[rgb(var(--app-ink))] transition hover:bg-[rgb(var(--app-soft))]"
            aria-label={isOpen ? "Collapse navigation menu" : "Expand navigation menu"}
            aria-expanded={isOpen}
          >
            <span className="flex flex-col gap-1.5">
              <span className="block h-0.5 w-5 rounded-full bg-current" />
              <span className="block h-0.5 w-5 rounded-full bg-current" />
              <span className="block h-0.5 w-5 rounded-full bg-current" />
            </span>
          </button>
        </div>

        <div
          className={`transition duration-200 ${
            isOpen
              ? "pointer-events-auto mt-4 opacity-100"
              : "pointer-events-none mt-0 h-0 overflow-hidden opacity-0"
          }`}
        >
          {accessibilityMode ? (
            <a href="#main-content" className="mb-3 inline-flex text-xs font-medium text-[rgb(var(--app-brand))] underline-offset-4 hover:underline">
              Skip to page content
            </a>
          ) : null}

          <nav className="flex flex-col gap-1.5" aria-label="Primary navigation links">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                aria-label={item.label}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-[rgb(var(--app-brand))] text-white shadow-sm"
                      : "text-[rgb(var(--app-ink))] hover:bg-[rgb(var(--app-soft))]"
                  }`
                }
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-current/10">
                  <img src={navIconSrc[item.icon]} alt="" className="h-4 w-4 object-contain" aria-hidden="true" />
                </span>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto space-y-4 pt-6">
            <div className="rounded-2xl border border-[rgb(var(--app-line))] bg-white px-4 py-3">
              <label
                htmlFor="sidebar-accessibility-mode"
                className="flex cursor-pointer items-center justify-between gap-3"
              >
                <div>
                  <div className="text-sm font-medium text-[rgb(var(--app-ink))]">
                    Accessibility mode
                  </div>
                  <div className="text-xs app-muted">
                    Stronger focus, borders, and contrast
                  </div>
                </div>
                <span
                  className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${
                    accessibilityMode ? "bg-[rgb(var(--app-brand))]" : "bg-[rgb(var(--app-line))]"
                  }`}
                >
                  <input
                    id="sidebar-accessibility-mode"
                    type="checkbox"
                    checked={accessibilityMode}
                    onChange={onToggleAccessibilityMode}
                    className="peer sr-only"
                    aria-label="Toggle accessibility mode"
                  />
                  <span
                    className={`absolute left-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
                      accessibilityMode ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </span>
              </label>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full rounded-2xl border px-4 py-3 text-sm font-medium transition hover:bg-red-100"
              style={{
                borderColor: "rgb(var(--app-danger-line))",
                backgroundColor: "rgb(var(--app-danger-soft))",
                color: "rgb(var(--app-danger))",
              }}
            >
              Log out
            </button>
          </div>
        </div>

        {!isOpen ? (
          <div className="mt-4 flex flex-1 flex-col items-center gap-2">
            <nav className="flex w-full flex-col items-center gap-2" aria-label="Primary navigation links">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                title={item.label}
                aria-label={item.label}
                className={({ isActive }) =>
                  `flex h-10 w-10 items-center justify-center rounded-2xl border transition ${
                    isActive
                      ? "border-transparent bg-[rgb(var(--app-brand))] text-white shadow-sm"
                      : "border-[rgb(var(--app-line))] bg-white text-[rgb(var(--app-ink))] hover:bg-[rgb(var(--app-soft))]"
                  }`
                }
              >
                <NavBadge item={item} />
              </NavLink>
            ))}
            </nav>

            <label
              htmlFor="sidebar-accessibility-mode-collapsed"
              className="mt-auto flex cursor-pointer flex-col items-center gap-1 px-1 pb-2 pt-4 text-center"
            >
              <span
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                  accessibilityMode ? "bg-[rgb(var(--app-brand))]" : "bg-[rgb(var(--app-line))]"
                }`}
              >
                <input
                  id="sidebar-accessibility-mode-collapsed"
                  type="checkbox"
                  checked={accessibilityMode}
                  onChange={onToggleAccessibilityMode}
                  className="sr-only"
                  aria-label="Toggle accessibility mode"
                />
                <span
                  className={`absolute left-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
                    accessibilityMode ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </span>
              <span className="text-[10px] font-medium leading-tight text-[rgb(var(--app-ink))]">
                Accessibility
              </span>
            </label>

            <button
              type="button"
              onClick={handleLogout}
              title="Log out"
              aria-label="Log out"
              className="flex h-10 w-10 items-center justify-center rounded-2xl border text-[rgb(185_28_28)] transition hover:bg-red-100"
              style={{
                borderColor: "rgb(var(--app-danger-line))",
                backgroundColor: "rgb(var(--app-danger-soft))",
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                <path d="M10 17l-5-5 5-5M5 12h10M14 4h4v16h-4" />
              </svg>
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
