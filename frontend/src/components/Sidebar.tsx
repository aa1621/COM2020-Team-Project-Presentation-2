import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

type NavItem = {
  label: string;
  href: string;
  icon: "dashboard" | "pets" | "shop" | "groups" | "challenges" | "log" | "leaderboards" | "profile" | "moderation";
};

const baseNavItems: NavItem[] = [
  { label: "Dashboard", href: "/app/dashboard", icon: "dashboard" },
  { label: "Pets", href: "/app/pets", icon: "pets" },
  { label: "Shop", href: "/app/shop", icon: "shop" },
  { label: "Groups", href: "/app/groups", icon: "groups" },
  { label: "Challenges", href: "/app/challenges", icon: "challenges" },
  { label: "Log action", href: "/app/log-action", icon: "log" },
  { label: "Leaderboards", href: "/app/leaderboards", icon: "leaderboards" },
  { label: "Profile", href: "/app/profile", icon: "profile" },
];

function NavIcon({ icon }: { icon: NavItem["icon"] }) {
  const common = "h-5 w-5";

  switch (icon) {
    case "dashboard":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common}>
          <path d="M4 13h7V4H4zM13 20h7v-9h-7zM13 4h7v5h-7zM4 20h7v-5H4z" />
        </svg>
      );
    case "pets":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common}>
          <path d="M12 13c2.9 0 5 1.8 5 4.2 0 1.6-1.3 2.8-2.9 2.8-.9 0-1.5-.4-2.1-.9-.6.5-1.2.9-2.1.9C8.3 20 7 18.8 7 17.2 7 14.8 9.1 13 12 13Z" />
          <circle cx="7.5" cy="8" r="1.5" />
          <circle cx="11" cy="5.5" r="1.5" />
          <circle cx="16.5" cy="8" r="1.5" />
          <circle cx="13" cy="4.5" r="1.5" />
        </svg>
      );
    case "shop":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common}>
          <path d="M5 8h14l-1 11H6L5 8Z" />
          <path d="M9 10V7a3 3 0 0 1 6 0v3" />
        </svg>
      );
    case "groups":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common}>
          <circle cx="9" cy="8" r="3" />
          <circle cx="17" cy="9" r="2.5" />
          <path d="M4 18a5 5 0 0 1 10 0M14.5 18a3.5 3.5 0 0 1 5.5-2.8" />
        </svg>
      );
    case "challenges":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common}>
          <path d="M8 4h8v3a4 4 0 0 0 3 3v1a7 7 0 1 1-14 0v-1a4 4 0 0 0 3-3V4Z" />
          <path d="M9 20h6" />
        </svg>
      );
    case "log":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common}>
          <path d="M7 4h8l4 4v12H7z" />
          <path d="M15 4v4h4M10 12h6M10 16h6" />
        </svg>
      );
    case "leaderboards":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common}>
          <path d="M6 20V10M12 20V4M18 20v-7" />
        </svg>
      );
    case "profile":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
        </svg>
      );
    case "moderation":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={common}>
          <path d="M12 3l7 3v6c0 4.3-2.9 7-7 9-4.1-2-7-4.7-7-9V6l7-3Z" />
          <path d="m9.5 12 1.7 1.7L14.8 10" />
        </svg>
      );
  }
}

export default function Sidebar({
  isOpen,
  onToggle,
}: {
  isOpen: boolean;
  onToggle: () => void;
}) {
  const { clearUser, user } = useAuth();
  const canModerate = user?.role === "moderator" || user?.role === "maintainer";
  const navItems: NavItem[] = canModerate
    ? [
        ...baseNavItems.slice(0, 5),
        { label: "Moderation", href: "/app/moderation", icon: "moderation" },
        ...baseNavItems.slice(5),
      ]
    : baseNavItems;

  function handleLogout() {
    clearUser();
    window.location.href = "/login";
  }

  return (
    <aside
      className={`fixed left-4 top-4 z-50 transition-[width] duration-300 ease-out sm:left-6 sm:top-6 ${
        isOpen ? "w-[min(22rem,calc(100vw-2rem))]" : "w-14 sm:w-16"
      }`}
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
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  `rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-[rgb(var(--app-brand))] text-white shadow-sm"
                      : "text-[rgb(var(--app-ink))] hover:bg-[rgb(var(--app-soft))]"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto space-y-4 pt-6">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full rounded-2xl border px-4 py-3 text-sm font-medium transition hover:bg-red-100"
              style={{
                borderColor: "rgb(254 202 202)",
                backgroundColor: "rgb(var(--app-danger-soft))",
                color: "rgb(185 28 28)",
              }}
            >
              Log out
            </button>
          </div>
        </div>

        {!isOpen ? (
          <nav className="mt-4 flex flex-1 flex-col items-center gap-2">
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
                <NavIcon icon={item.icon} />
              </NavLink>
            ))}

            <button
              type="button"
              onClick={handleLogout}
              title="Log out"
              aria-label="Log out"
              className="mt-auto flex h-10 w-10 items-center justify-center rounded-2xl border text-[rgb(185_28_28)] transition hover:bg-red-100"
              style={{
                borderColor: "rgb(254 202 202)",
                backgroundColor: "rgb(var(--app-danger-soft))",
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                <path d="M10 17l-5-5 5-5M5 12h10M14 4h4v16h-4" />
              </svg>
            </button>
          </nav>
        ) : null}
      </div>
    </aside>
  );
}
