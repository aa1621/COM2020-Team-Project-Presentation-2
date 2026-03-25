import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { getAllBadges, getEarnedBadges } from "../api/badges";
import PageShell from "../components/PageShell";
import { getGroups } from "../api/groups";
import type { AccessibilitySettings } from "../accessibility/accessibilityMode";
import { useAuth } from "../auth/AuthProvider";
import type { Badge, EarnedBadgeEntry, Group } from "../api/types";

type LayoutContext = {
  accessibilitySettings: AccessibilitySettings;
  setAccessibilitySettings: (settings: AccessibilitySettings) => void;
};

function SettingToggle({
  id,
  title,
  description,
  checked,
  disabled = false,
  onChange,
}: {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className={`app-card-soft p-4 ${disabled ? "opacity-70" : ""}`}>
      <label
        htmlFor={id}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <div className="text-sm font-medium text-[rgb(var(--app-ink))]">{title}</div>
          <div className="text-xs app-muted">{description}</div>
        </div>
        <span
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${
            checked ? "bg-[rgb(var(--app-brand))]" : "bg-[rgb(var(--app-line))]"
          }`}
        >
          <input
            id={id}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="sr-only"
            disabled={disabled}
          />
          <span
            className={`absolute left-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
              checked ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </span>
      </label>
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { accessibilitySettings, setAccessibilitySettings } =
    useOutletContext<LayoutContext>();
  const [groups, setGroups] = useState<Group[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadgeEntry[]>([]);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [groupsRes, earnedRes, allRes] = await Promise.all([
          getGroups(),
          getEarnedBadges(),
          getAllBadges(true),
        ]);
        setGroups(groupsRes.groups || []);
        setEarnedBadges(earnedRes.badges || []);
        setAllBadges(allRes.badges || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile details.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const group = useMemo(() => {
    if (!user?.group_id) return null;
    return groups.find((g) => g.group_id === user.group_id) || null;
  }, [groups, user]);

  const settingsEnabledCount = [
    accessibilitySettings.enabled,
    accessibilitySettings.boldText,
    accessibilitySettings.reducedMotion,
    accessibilitySettings.compactLayout,
    accessibilitySettings.darkMode,
  ].filter(Boolean).length;
  const earnedBadgeIds = useMemo(
    () => new Set(earnedBadges.map((entry) => entry.badges.badge_id)),
    [earnedBadges]
  );
  const lockedBadges = useMemo(
    () => allBadges.filter((badge) => !earnedBadgeIds.has(badge.badge_id)),
    [allBadges, earnedBadgeIds]
  );

  return (
    <PageShell
      title="Profile / Settings"
      subtitle="Manage your account, group status, and interface preferences."
    >
      <div className="space-y-6">
        {error && (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {!user && (
          <div className="rounded-xl bg-white p-4 text-sm text-gray-700">
            Please log in to view your profile.
          </div>
        )}

        {user ? (
          <>
            <section className="app-card overflow-hidden">
              <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="bg-[linear-gradient(140deg,rgba(221,243,229,0.92),rgba(245,236,215,0.7))] p-6">
                  <div className="app-chip">Player profile</div>
                  <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[rgb(var(--app-ink))]">
                    {user.display_name || user.username}
                  </h2>
                  <p className="mt-2 max-w-xl text-sm app-muted">
                    Keep your account details, group membership, and display preferences in one
                    place.
                  </p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="app-stat">
                      <div className="text-xs uppercase tracking-wide app-muted">Username</div>
                      <div className="mt-1 text-base font-semibold text-[rgb(var(--app-ink))]">
                        {user.username}
                      </div>
                    </div>
                    <div className="app-stat">
                      <div className="text-xs uppercase tracking-wide app-muted">Role</div>
                      <div className="mt-1 text-base font-semibold text-[rgb(var(--app-ink))]">
                        {user.role || "Member"}
                      </div>
                    </div>
                    <div className="app-stat">
                      <div className="text-xs uppercase tracking-wide app-muted">
                        Active settings
                      </div>
                      <div className="mt-1 text-base font-semibold text-[rgb(var(--app-ink))]">
                        {settingsEnabledCount}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 p-6 sm:grid-cols-2">
                  <div className="app-card-soft p-4">
                    <div className="text-xs uppercase tracking-wide app-muted">Display name</div>
                    <div className="mt-1 text-sm font-semibold text-[rgb(var(--app-ink))]">
                      {user.display_name || "Not set"}
                    </div>
                  </div>
                  <div className="app-card-soft p-4">
                    <div className="text-xs uppercase tracking-wide app-muted">User ID</div>
                    <div className="mt-1 break-all text-sm font-semibold text-[rgb(var(--app-ink))]">
                      {user.user_id}
                    </div>
                  </div>
                  <div className="app-card-soft p-4 sm:col-span-2">
                    <div className="text-xs uppercase tracking-wide app-muted">Current group</div>
                    {loading ? (
                      <div className="mt-1 text-sm app-muted">Loading group...</div>
                    ) : group ? (
                      <>
                        <div className="mt-1 text-sm font-semibold text-[rgb(var(--app-ink))]">
                          {group.name}
                        </div>
                        <div className="mt-1 text-xs app-muted">
                          {group.type || "Society"} · {group.member_count || 0} members
                        </div>
                      </>
                    ) : (
                      <div className="mt-1 text-sm app-muted">No group joined yet.</div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
              <div className="app-card p-6">
                <div className="app-chip">Accessibility</div>
                <h2 className="mt-4 text-2xl font-semibold text-[rgb(var(--app-ink))]">
                  Reading and navigation support
                </h2>
                <p className="mt-2 text-sm app-muted">
                  Adjust contrast and text emphasis for easier scanning and keyboard use.
                </p>

                <div className="mt-5 space-y-3">
                  <SettingToggle
                    id="profile-accessibility-mode"
                    title="Accessibility mode"
                    description="Stronger focus styles, clearer borders, and higher visibility controls."
                    checked={accessibilitySettings.enabled}
                    onChange={(checked) =>
                      setAccessibilitySettings({
                        ...accessibilitySettings,
                        enabled: checked,
                      })
                    }
                  />
                  <SettingToggle
                    id="profile-bold-text"
                    title="Bold text"
                    description="Makes labels, helper text, and interface copy appear heavier."
                    checked={accessibilitySettings.boldText}
                    disabled={!accessibilitySettings.enabled}
                    onChange={(checked) =>
                      setAccessibilitySettings({
                        ...accessibilitySettings,
                        boldText: checked,
                      })
                    }
                  />
                </div>
              </div>

              <div className="app-card p-6">
                <div className="app-chip">Display</div>
                <h2 className="mt-4 text-2xl font-semibold text-[rgb(var(--app-ink))]">
                  Interface preferences
                </h2>
                <p className="mt-2 text-sm app-muted">
                  Tune the overall feel of the app to match how you like to browse it.
                </p>

                <div className="mt-5 space-y-3">
                  <SettingToggle
                    id="profile-dark-mode"
                    title="Dark mode"
                    description="Switches the app to a darker colour palette for lower-light browsing."
                    checked={accessibilitySettings.darkMode}
                    onChange={(checked) =>
                      setAccessibilitySettings({
                        ...accessibilitySettings,
                        darkMode: checked,
                      })
                    }
                  />
                  <SettingToggle
                    id="profile-reduced-motion"
                    title="Reduced motion"
                    description="Minimises animation and transition effects across the interface."
                    checked={accessibilitySettings.reducedMotion}
                    onChange={(checked) =>
                      setAccessibilitySettings({
                        ...accessibilitySettings,
                        reducedMotion: checked,
                      })
                    }
                  />
                  <SettingToggle
                    id="profile-compact-layout"
                    title="Compact layout"
                    description="Tightens spacing on cards, controls, and labels to fit more on screen."
                    checked={accessibilitySettings.compactLayout}
                    onChange={(checked) =>
                      setAccessibilitySettings({
                        ...accessibilitySettings,
                        compactLayout: checked,
                      })
                    }
                  />
                </div>
              </div>
            </section>

            <section className="app-card p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="app-chip">Badges</div>
                  <h2 className="mt-4 text-2xl font-semibold text-[rgb(var(--app-ink))]">
                    Badges you've earned
                  </h2>
                  <p className="mt-2 text-sm app-muted">
                    See what you already have and what is still left to unlock.
                  </p>
                </div>
                <div className="app-stat min-w-[120px] px-4 py-3 text-center">
                  <div className="text-xs uppercase tracking-wide app-muted">Earned</div>
                  <div className="mt-1 text-2xl font-semibold text-[rgb(var(--app-ink))]">
                    {earnedBadges.length}
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.95fr]">
                <div>
                  <div className="text-xs uppercase tracking-wide app-muted">Unlocked</div>
                  {earnedBadges.length > 0 ? (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {earnedBadges.map((entry) => (
                        <div key={entry.user_badge_id} className="app-card-soft p-4">
                          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[1.2rem] bg-white">
                            {entry.badges.image_url ? (
                              <img
                                src={entry.badges.image_url}
                                alt={entry.badges.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-lg font-semibold text-[rgb(var(--app-ink))]">
                                {entry.badges.name.slice(0, 1).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="mt-3 text-base font-semibold text-[rgb(var(--app-ink))]">
                            {entry.badges.name}
                          </div>
                          <div className="mt-1 text-sm app-muted">
                            {entry.badges.description || "Achievement unlocked."}
                          </div>
                          <div className="mt-3 text-xs app-muted">
                            Earned {new Date(entry.earned_at).toLocaleDateString("en-GB")}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 rounded-[1.5rem] border border-dashed border-[rgb(var(--app-line))] bg-[rgb(var(--app-soft))]/60 p-5">
                      <div className="text-sm font-semibold text-[rgb(var(--app-ink))]">
                        No badges yet
                      </div>
                      <div className="mt-2 text-sm app-muted">
                        Log actions and complete challenge submissions to unlock your first badge.
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-xs uppercase tracking-wide app-muted">Still to earn</div>
                  {lockedBadges.length > 0 ? (
                    <div className="mt-3 space-y-3">
                      {lockedBadges.slice(0, 6).map((badge) => (
                        <div key={badge.badge_id} className="app-card-soft flex items-center gap-4 p-4 opacity-85">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[1.1rem] bg-white">
                            {badge.image_url ? (
                              <img
                                src={badge.image_url}
                                alt={badge.name}
                                className="h-full w-full object-cover grayscale"
                              />
                            ) : (
                              <span className="text-lg font-semibold text-[rgb(var(--app-ink))]">
                                {badge.name.slice(0, 1).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-base font-semibold text-[rgb(var(--app-ink))]">
                              {badge.name}
                            </div>
                            <div className="mt-1 text-sm app-muted">
                              {badge.description || "Keep progressing to unlock this badge."}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 rounded-[1.5rem] border border-dashed border-[rgb(var(--app-line))] bg-[rgb(var(--app-soft))]/60 p-5">
                      <div className="text-sm font-semibold text-[rgb(var(--app-ink))]">
                        You've unlocked every active badge
                      </div>
                      <div className="mt-2 text-sm app-muted">
                        There are no remaining active badges in the current catalog.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </PageShell>
  );
}
