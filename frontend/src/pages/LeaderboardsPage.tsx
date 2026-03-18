import { useEffect, useState } from "react";
import PageShell from "../components/PageShell";
import { getUserLeaderboards } from "../api/leaderboards";
import { useAuth } from "../auth/AuthProvider";
import { getMyPet } from "../api/pets";
import type { UserLeaderboardEntry } from "../api/types";

type Scope = "all" | "group";

export default function LeaderboardsPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<UserLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<Scope>("all");
  const [myPetName, setMyPetName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadMyPet() {
      if (!user?.user_id) return;
      try {
        const res = await getMyPet();
        if (!cancelled) {
          setMyPetName(res.pet.nickname);
        }
      } catch {
        if (!cancelled) {
          setMyPetName(null);
        }
      }
    }

    loadMyPet();
    return () => {
      cancelled = true;
    };
  }, [user?.user_id]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const groupId = scope === "group" ? user?.group_id || undefined : undefined;
        const res = await getUserLeaderboards(groupId);
        setEntries(res.leaderboards || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load leaderboards.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [scope, user]);

  return (
    <PageShell
      title="Leaderboards"
      subtitle="Track who is setting the pace across campus actions, streaks, and community momentum."
      right={
        <div className="flex gap-2">
          <button
            onClick={() => setScope("all")}
            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide ${
              scope === "all"
                ? "bg-[rgb(var(--app-ink))] text-white"
                : "bg-white text-[rgb(var(--app-ink))]"
            }`}
          >
            All users
          </button>
          <button
            onClick={() => setScope("group")}
            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide ${
              scope === "group"
                ? "bg-[rgb(var(--app-ink))] text-white"
                : "bg-white text-[rgb(var(--app-ink))]"
            }`}
            disabled={!user?.group_id}
          >
            My group
          </button>
        </div>
      }
    >
      <div className="app-card p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="app-chip">Season ranking</div>
            <h2 className="mt-3 app-section-title">Member leaderboard</h2>
          </div>
          <div className="text-sm app-muted">
            {scope === "all" ? "Across all players" : "Within your current group"}
          </div>
        </div>

        {error && (
          <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}

        {loading && <div className="text-sm app-muted">Loading leaderboard...</div>}

        {!loading && !error && (
          <div className="space-y-3">
            {entries.length === 0 && (
              <div className="app-card-soft p-4 text-sm app-muted">No leaderboard entries yet.</div>
            )}
            {entries.map((entry, index) => {
              const isMe = user?.user_id === entry.user_id;
              const displayName = entry.display_name || entry.username;
              const petLabel = isMe && myPetName ? myPetName : "Pet linked separately";
              const petAvatar = isMe && myPetName ? myPetName.slice(0, 2).toUpperCase() : null;

              return (
                <div
                  key={entry.user_id}
                  className={`rounded-[1.6rem] border p-4 transition ${
                    isMe
                      ? "border-emerald-200 bg-emerald-50/80"
                      : "border-[rgb(var(--app-line))] bg-white/90"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[rgb(var(--app-soft))] text-sm font-semibold text-[rgb(var(--app-ink))]">
                        {index + 1}
                      </div>
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[1.25rem] bg-[rgb(var(--app-soft))]">
                        {petAvatar ? (
                          <span className="text-sm font-semibold uppercase tracking-wide text-[rgb(var(--app-ink))]">
                            {petAvatar}
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold uppercase tracking-wide app-muted">
                            Pet
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-base font-semibold text-[rgb(var(--app-ink))]">
                          {displayName}
                        </div>
                        <div className="text-sm app-muted">{entry.group_name || "No group"}</div>
                        <div className="text-xs text-gray-400">{petLabel}</div>
                      </div>
                    </div>

                    <div className="app-stat min-w-[92px] px-4 py-3 text-center">
                      <div className="text-[11px] uppercase tracking-wide app-muted">Points</div>
                      <div className="mt-1 text-lg font-semibold text-[rgb(var(--app-ink))]">
                        {entry.points}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
}
