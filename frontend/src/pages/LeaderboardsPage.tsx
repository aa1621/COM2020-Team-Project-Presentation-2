import { useEffect, useState } from "react";
import PageShell from "../components/PageShell";
import { getGroupLeaderboards, getUserLeaderboards } from "../api/leaderboards";
import { useAuth } from "../auth/AuthProvider";
import { getMyPet } from "../api/pets";
import type { GroupLeaderboardEntry, UserLeaderboardEntry } from "../api/types";
import { resolveGameAssetUrl } from "../utils/gameAssetUrl";

type Scope = "all" | "group" | "groups";
type TermKey = "overall" | "autumn" | "spring" | "summer";

const TERM_OPTIONS: Array<{
  key: TermKey;
  label: string;
  dates: string;
  start?: string;
  end?: string;
}> = [
  { key: "overall", label: "Overall", dates: "All logged activity" },
  {
    key: "autumn",
    label: "Autumn term",
    dates: "Monday 22 September 2025 - Friday 12 December 2025",
    start: "2025-09-22",
    end: "2025-12-12",
  },
  {
    key: "spring",
    label: "Spring term",
    dates: "Monday 5 January 2026 - Friday 27 March 2026",
    start: "2026-01-05",
    end: "2026-03-27",
  },
  {
    key: "summer",
    label: "Summer term",
    dates: "Monday 27 April 2026 - Friday 12 June 2026",
    start: "2026-04-27",
    end: "2026-06-12",
  },
];

function formatLeaderboardPoints(value: number) {
  return Math.round(value);
}

export default function LeaderboardsPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<UserLeaderboardEntry[]>([]);
  const [groupEntries, setGroupEntries] = useState<GroupLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<Scope>("all");
  const [term, setTerm] = useState<TermKey>("overall");
  const [myPetName, setMyPetName] = useState<string | null>(null);

  const selectedTerm = TERM_OPTIONS.find((option) => option.key === term) ?? TERM_OPTIONS[0];

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
        const query = {
          start: selectedTerm.start,
          end: selectedTerm.end,
        };

        if (scope === "groups") {
          const res = await getGroupLeaderboards(query);
          setGroupEntries(res.leaderboards || []);
          setEntries([]);
        } else {
          const groupId = scope === "group" ? user?.group_id || undefined : undefined;
          const res = await getUserLeaderboards({
            ...query,
            groupId,
          });
          setEntries(res.leaderboards || []);
          setGroupEntries([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load leaderboards.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [scope, selectedTerm.end, selectedTerm.start, user?.group_id]);

  return (
    <PageShell
      title="Leaderboards"
      subtitle="Compare points across users and groups, or switch to a university term view."
      right={
        <div className="flex flex-wrap items-center gap-2">
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
          <button
            onClick={() => setScope("groups")}
            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide ${
              scope === "groups"
                ? "bg-[rgb(var(--app-ink))] text-white"
                : "bg-white text-[rgb(var(--app-ink))]"
            }`}
          >
            Groups
          </button>
          <select
            className="rounded-full border border-[rgb(var(--app-line))] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--app-ink))]"
            value={term}
            onChange={(e) => setTerm(e.target.value as TermKey)}
            aria-label="Leaderboard term"
          >
            {TERM_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      }
    >
      <div className="app-card p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="app-chip">Rankings</div>
            <h2 className="mt-3 app-section-title">
              {scope === "groups" ? "Group leaderboard" : "Member leaderboard"}
            </h2>
            <div className="mt-2 text-sm app-muted">{selectedTerm.dates}</div>
          </div>
          <div className="text-sm app-muted">
            {scope === "all"
              ? "Across all players"
              : scope === "group"
                ? "Within your current group"
                : "Group totals across campus"}
          </div>
        </div>

        {error && (
          <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}

        {loading && <div className="text-sm app-muted">Loading leaderboard...</div>}

        {!loading && !error && scope !== "groups" && (
          <div className="space-y-3">
            {entries.length === 0 && (
              <div className="app-card-soft p-4 text-sm app-muted">No leaderboard entries yet.</div>
            )}
            {entries.map((entry, index) => {
              const isMe = user?.user_id === entry.user_id;
              const displayName = entry.display_name || entry.username;
              const petLabel = entry.pet_name || (isMe && myPetName) || "Campus companion";
              const petImageUrl = resolveGameAssetUrl(entry.pet_image_url);
              const petAvatar = petLabel.slice(0, 2).toUpperCase();

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
                        {petImageUrl ? (
                          <img
                            src={petImageUrl}
                            alt={petLabel}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <span className="text-sm font-semibold uppercase tracking-wide text-[rgb(var(--app-ink))]">
                            {petAvatar}
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
                        {formatLeaderboardPoints(entry.points)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && !error && scope === "groups" && (
          <div className="space-y-3">
            {groupEntries.length === 0 && (
              <div className="app-card-soft p-4 text-sm app-muted">No group leaderboard entries yet.</div>
            )}
            {groupEntries.map((entry, index) => {
              const isMyGroup = user?.group_id != null && user.group_id === entry.group_id;

              return (
                <div
                  key={entry.group_id}
                  className={`rounded-[1.6rem] border p-4 transition ${
                    isMyGroup
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
                        <span className="text-[10px] font-semibold uppercase tracking-wide app-muted">
                          Team
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-base font-semibold text-[rgb(var(--app-ink))]">
                          {entry.name}
                        </div>
                        <div className="text-sm app-muted">{entry.type || "Society"}</div>
                        <div className="text-xs text-gray-400">
                          {entry.member_count} members
                        </div>
                      </div>
                    </div>

                    <div className="app-stat min-w-[92px] px-4 py-3 text-center">
                      <div className="text-[11px] uppercase tracking-wide app-muted">Points</div>
                      <div className="mt-1 text-lg font-semibold text-[rgb(var(--app-ink))]">
                        {formatLeaderboardPoints(entry.points)}
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
