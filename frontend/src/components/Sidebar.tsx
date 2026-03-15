import { NavLink } from "react-router-dom";
import { clearDemoUser, getDemoUser } from "../auth/demoAuth";
import { ensureGamificationState, getPetDisplay } from "../gamification/store";

type NavItem = {
  label: string;
  href: string;
};

const baseNavItems: NavItem[] = [
  { label: "Dashboard", href: "/app/dashboard" },
  { label: "Pets", href: "/app/pets" },
  { label: "Shop", href: "/app/shop" },
  { label: "Groups", href: "/app/groups" },
  { label: "Challenges", href: "/app/challenges" },
  { label: "Log action", href: "/app/log-action" },
  { label: "Leaderboards", href: "/app/leaderboards" },
  { label: "Profile", href: "/app/profile" },
];

export default function Sidebar() {
  const user = getDemoUser();
  const gamificationState = user?.user_id ? ensureGamificationState(user.user_id) : null;
  const petDisplay = gamificationState
    ? getPetDisplay(gamificationState.pet.nickname)
    : null;
  const canModerate = user?.role === "moderator" || user?.role === "maintainer";
  const navItems: NavItem[] = canModerate
    ? [
        ...baseNavItems.slice(0, 5),
        { label: "Moderation", href: "/app/moderation" },
        ...baseNavItems.slice(5),
      ]
    : baseNavItems;

  function handleLogout() {
    clearDemoUser();
    window.location.href = "/login";
  }

  return (
    <aside className="hidden w-72 shrink-0 md:flex md:flex-col md:gap-5">
      <div className="app-card flex h-full flex-col p-5">
        <div className="space-y-2">
          <div className="app-chip">Campus Carbon</div>
          <div>
            <div className="text-lg font-semibold tracking-tight text-[rgb(var(--app-ink))]">
              Exeter challenge hub
            </div>
            <div className="mt-1 text-sm app-muted">
              Sustainability actions, teams, and companion progress in one place.
            </div>
          </div>
        </div>

        <nav className="mt-6 flex flex-col gap-1.5">
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
          {gamificationState && petDisplay ? (
            <div className="overflow-hidden rounded-[1.5rem] border border-[rgb(var(--app-line))] bg-white">
              <div className={`bg-gradient-to-r ${petDisplay.accentClass} p-4`}>
                <div className="flex items-center gap-3">
                  <div className="flex h-16 w-16 items-center justify-center rounded-[1.1rem] bg-white/85 text-lg font-semibold text-[rgb(var(--app-ink))]">
                    {petDisplay.avatarLabel}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-700">
                      Active pet
                    </div>
                    <div className="truncate text-base font-semibold text-[rgb(var(--app-ink))]">
                      {gamificationState.pet.nickname}
                    </div>
                    <div className="text-xs text-gray-700">{petDisplay.tagline}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="app-stat p-3">
                    <div className="text-[11px] uppercase tracking-wide app-muted">Coins</div>
                    <div className="mt-1 text-base font-semibold text-[rgb(var(--app-ink))]">
                      {gamificationState.coins}
                    </div>
                  </div>
                  <div className="app-stat p-3">
                    <div className="text-[11px] uppercase tracking-wide app-muted">Streak</div>
                    <div className="mt-1 text-base font-semibold text-[rgb(var(--app-ink))]">
                      {gamificationState.pet.streakDays} days
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.15rem] bg-[rgb(var(--app-soft))] px-3 py-3">
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-wide app-muted">
                    <span>Energy</span>
                    <span>{gamificationState.pet.energy}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-white">
                    <div
                      className="h-2 rounded-full bg-amber-400"
                      style={{ width: `${gamificationState.pet.energy}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-[1.15rem] bg-[rgb(var(--app-soft))] px-3 py-2.5 text-xs">
                  <span className="app-muted">Status</span>
                  <span
                    className={`font-semibold ${
                      gamificationState.pet.status === "alive"
                        ? "text-emerald-700"
                        : "text-rose-700"
                    }`}
                  >
                    {gamificationState.pet.status === "alive" ? "Alive" : "Needs revive"}
                  </span>
                </div>
              </div>
            </div>
          ) : null}

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
    </aside>
  );
}
