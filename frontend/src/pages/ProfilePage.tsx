import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import PageShell from "../components/PageShell";
import { getGroups } from "../api/groups";
import type { AccessibilitySettings } from "../accessibility/accessibilityMode";
import { useAuth } from "../auth/AuthProvider";
import type { Group } from "../api/types";

type LayoutContext = {
  accessibilitySettings: AccessibilitySettings;
  setAccessibilitySettings: (settings: AccessibilitySettings) => void;
};

export default function ProfilePage() {
  const { user } = useAuth();
  const { accessibilitySettings, setAccessibilitySettings } =
    useOutletContext<LayoutContext>();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await getGroups();
        setGroups(res.groups || []);
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

  return (
    <PageShell title="Profile / Settings" subtitle="Manage your account and preferences.">
      <div className="rounded-2xl border border-gray-100 bg-white/80 p-6 shadow-sm">
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!user && (
          <div className="rounded-xl bg-white p-4 text-sm text-gray-700">
            Please log in to view your profile.
          </div>
        )}

        {user && (
          <div className="space-y-6">
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">Account</div>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-white p-4">
                  <div className="text-xs text-gray-500">Display name</div>
                  <div className="text-sm text-gray-900">
                    {user.display_name || "Not set"}
                  </div>
                </div>
                <div className="rounded-xl bg-white p-4">
                  <div className="text-xs text-gray-500">Username</div>
                  <div className="text-sm text-gray-900">{user.username}</div>
                </div>
                <div className="rounded-xl bg-white p-4">
                  <div className="text-xs text-gray-500">Role</div>
                  <div className="text-sm text-gray-900">{user.role || "Member"}</div>
                </div>
                <div className="rounded-xl bg-white p-4">
                  <div className="text-xs text-gray-500">User ID</div>
                  <div className="text-sm text-gray-900 break-all">{user.user_id}</div>
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">Group</div>
              <div className="mt-2 rounded-xl bg-white p-4">
                {loading && <div className="text-sm text-gray-600">Loading group...</div>}
                {!loading && group && (
                  <div>
                    <div className="text-sm text-gray-900">{group.name}</div>
                    <div className="text-xs text-gray-500">
                      {group.type || "Society"} · {group.member_count || 0} members
                    </div>
                  </div>
                )}
                {!loading && !group && (
                  <div className="text-sm text-gray-700">No group joined yet.</div>
                )}
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">Settings</div>
              <div className="mt-2 space-y-3">
                <div className="rounded-xl bg-white p-4">
                <label
                  htmlFor="profile-accessibility-mode"
                  className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900">Accessibility mode</div>
                    <div className="text-xs text-gray-500">
                      Stronger focus styles, clearer borders, and easier-to-see controls.
                    </div>
                  </div>
                  <span
                    className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${
                      accessibilitySettings.enabled
                        ? "bg-[rgb(var(--app-brand))]"
                        : "bg-[rgb(var(--app-line))]"
                    }`}
                  >
                    <input
                      id="profile-accessibility-mode"
                      type="checkbox"
                      checked={accessibilitySettings.enabled}
                      onChange={(e) =>
                        setAccessibilitySettings({
                          ...accessibilitySettings,
                          enabled: e.target.checked,
                        })
                      }
                      className="sr-only"
                      aria-label="Toggle accessibility mode"
                    />
                    <span
                      className={`absolute left-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
                        accessibilitySettings.enabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </span>
                </label>
                </div>

                <div
                  className={`rounded-xl bg-white p-4 ${
                    accessibilitySettings.enabled ? "" : "opacity-70"
                  }`}
                >
                  <label
                    htmlFor="profile-bold-text"
                    className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-900">Bold text</div>
                      <div className="text-xs text-gray-500">
                        Makes interface copy and labels appear heavier and easier to read.
                      </div>
                    </div>
                    <span
                      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${
                        accessibilitySettings.boldText
                          ? "bg-[rgb(var(--app-brand))]"
                          : "bg-[rgb(var(--app-line))]"
                      }`}
                    >
                      <input
                        id="profile-bold-text"
                        type="checkbox"
                        checked={accessibilitySettings.boldText}
                        onChange={(e) =>
                          setAccessibilitySettings({
                            ...accessibilitySettings,
                            boldText: e.target.checked,
                          })
                        }
                        className="sr-only"
                        aria-label="Toggle bold text"
                        disabled={!accessibilitySettings.enabled}
                      />
                      <span
                        className={`absolute left-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
                          accessibilitySettings.boldText ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
