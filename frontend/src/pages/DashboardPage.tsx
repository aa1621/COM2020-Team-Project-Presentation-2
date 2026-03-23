import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api/client";
import { getCoinBalance } from "../api/coins";
import { getActionLogs } from "../api/actionLogs";
import { getEarnedBadges } from "../api/badges";
import { getChallenges } from "../api/challenges";
import { getUserLeaderboards } from "../api/leaderboards";
import { useAuth } from "../auth/AuthProvider";
import PageShell from "../components/PageShell";
import { createPet, getMyPet, getPetCatalog } from "../api/pets";
import type {
  ActionType,
  Challenge,
  EarnedBadgeEntry,
  GetActionTypesResponse,
  Pet,
  PetCatalogEntry,
  UserLeaderboardEntry,
} from "../api/types";

type DateRangeOption = 7 | 30;

function formatDateLabel(isoDate: string) {
  return isoDate.slice(5);
}

function toIsoDateUtc(date: Date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildDateRange(days: number) {
  const out: string[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    out.push(toIsoDateUtc(d));
  }
  return out;
}

function isMissingPetError(error: unknown) {
  return error instanceof Error && /no pet found|user has no pet/i.test(error.message);
}

function isCurrentChallenge(challenge: Challenge, today: string) {
  const startsOkay = !challenge.start_date || challenge.start_date <= today;
  const endsOkay = !challenge.end_date || challenge.end_date >= today;
  return startsOkay && endsOkay;
}

function formatShortDate(date: string | null) {
  if (!date) return "No deadline";
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function formatLeaderboardPoints(value: number) {
  return Math.round(value);
}

function PetSetupModal({
  nickname,
  onChangeNickname,
  onChooseType,
  onSubmit,
  petCatalog,
  petType,
  submitting,
  error,
}: {
  nickname: string;
  onChangeNickname: (value: string) => void;
  onChooseType: (value: string) => void;
  onSubmit: () => void;
  petCatalog: PetCatalogEntry[];
  petType: string;
  submitting: boolean;
  error: string | null;
}) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const nicknameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    nicknameInputRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]'
        )
      );

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.52)] p-4 backdrop-blur-sm"
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-4xl overflow-hidden rounded-[2rem] border border-white/60 bg-[linear-gradient(145deg,rgba(244,252,246,0.98),rgba(255,248,234,0.98))] shadow-[0_30px_90px_rgba(15,23,42,0.24)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pet-setup-title"
        aria-describedby="pet-setup-description"
      >
        <div className="grid gap-0 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="bg-[linear-gradient(160deg,rgba(16,185,129,0.18),rgba(250,204,21,0.15))] p-6 lg:p-8">
            <div className="app-chip bg-white/80">Companion setup</div>
            <h2 id="pet-setup-title" className="mt-4 text-4xl font-semibold tracking-tight text-[rgb(var(--app-ink))]">
              Choose your first campus companion
            </h2>
            <p id="pet-setup-description" className="mt-4 max-w-md text-sm leading-7 app-muted">
              Pick a starter pet and give it a name before you start tracking progress.
            </p>
          </div>

          <div className="p-6 lg:p-8">
            <fieldset>
              <legend className="text-sm font-medium text-[rgb(var(--app-ink))]">
                Choose a companion type
              </legend>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
              {petCatalog.map((option) => (
                <button
                  key={option.pet_type}
                  type="button"
                  onClick={() => onChooseType(option.pet_type)}
                  aria-pressed={petType === option.pet_type}
                  aria-label={`Choose ${option.name}`}
                  className={`rounded-[1.6rem] border p-5 text-left transition ${
                    petType === option.pet_type
                      ? "border-transparent bg-[rgb(var(--app-brand))] text-white shadow-sm"
                      : "border-[rgb(var(--app-line))] bg-white text-[rgb(var(--app-ink))]"
                  }`}
                >
                  <div className="overflow-hidden rounded-[1.2rem] bg-[rgb(var(--app-soft))]">
                    {option.image_url ? (
                      <img
                        src={option.image_url}
                        alt={option.name}
                        className="h-28 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-28 w-full items-center justify-center text-3xl font-semibold">
                        {option.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] opacity-80">
                    Starter
                  </div>
                  <div className="mt-3 text-2xl font-semibold">{option.name}</div>
                  <div className="mt-2 text-sm opacity-90">
                    {option.description || option.pet_type}
                  </div>
                </button>
              ))}
              </div>
            </fieldset>

            <div className="mt-6 space-y-1.5">
              <label htmlFor="pet-setup-nickname" className="text-sm font-medium text-[rgb(var(--app-ink))]">
                Companion nickname
              </label>
              <input
                id="pet-setup-nickname"
                ref={nicknameInputRef}
                className="app-input"
                value={nickname}
                onChange={(e) => onChangeNickname(e.target.value)}
                placeholder="Companion nickname"
                aria-invalid={Boolean(error && !nickname.trim())}
              />
            </div>

            {error && (
              <div className="mt-4 rounded-[1.2rem] bg-red-50 px-4 py-3 text-sm text-red-700" role="alert" aria-live="polite">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={onSubmit}
              disabled={submitting}
              className="app-button-primary mt-6 disabled:opacity-50"
            >
              {submitting ? "Creating companion..." : "Create companion"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const displayName = user?.display_name || user?.username || "there";

  const [actionTypes, setActionTypes] = useState<ActionType[]>([]);
  const [logs, setLogs] = useState<
    Array<{
      log_id: string | number;
      action_type_id: string | number;
      action_date: string;
      calculated_co2e: number;
    }>
  >([]);
  const [pet, setPet] = useState<Pet | null>(null);
  const [petCatalog, setPetCatalog] = useState<PetCatalogEntry[]>([]);
  const [coins, setCoins] = useState<number | null>(null);
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadgeEntry[]>([]);
  const [leaderboardEntries, setLeaderboardEntries] = useState<UserLeaderboardEntry[]>([]);
  const [personalChallenges, setPersonalChallenges] = useState<Challenge[]>([]);
  const [groupChallenges, setGroupChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [petSetupType, setPetSetupType] = useState("");
  const [petSetupNickname, setPetSetupNickname] = useState("");
  const [petSetupSubmitting, setPetSetupSubmitting] = useState(false);
  const [petSetupError, setPetSetupError] = useState<string | null>(null);

  const [dateRange, setDateRange] = useState<DateRangeOption>(7);
  const [category, setCategory] = useState("all");

  const dateKeys = useMemo(() => buildDateRange(dateRange), [dateRange]);

  const actionTypeById = useMemo(() => {
    const map = new Map<string | number, ActionType>();
    actionTypes.forEach((t) => map.set(t.action_type_id, t));
    return map;
  }, [actionTypes]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    actionTypes.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return ["all", ...Array.from(set).sort()];
  }, [actionTypes]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!user?.user_id) return;
      setLoading(true);
      setError(null);
      try {
        const [
          typesResult,
          coinResult,
          petResult,
          catalogResult,
          earnedBadgesResult,
          leaderboardsResult,
          personalResult,
          groupResult,
        ] = await Promise.allSettled([
          apiFetch<GetActionTypesResponse>("/action-types"),
          getCoinBalance(),
          getMyPet().catch((err) => {
            if (isMissingPetError(err)) return null;
            throw err;
          }),
          getPetCatalog(),
          getEarnedBadges(),
          getUserLeaderboards(user.group_id || undefined),
          getChallenges("personal"),
          getChallenges("group"),
        ]);

        if (typesResult.status === "rejected") {
          throw typesResult.reason;
        }

        if (catalogResult.status === "rejected") {
          throw catalogResult.reason;
        }

        const typesRes = typesResult.value;
        const catalogRes = catalogResult.value;
        const coinRes = coinResult.status === "fulfilled" ? coinResult.value : null;
        const petRes = petResult.status === "fulfilled" ? petResult.value : null;
        const earnedBadgesRes = earnedBadgesResult.status === "fulfilled" ? earnedBadgesResult.value : null;
        const leaderboardsRes = leaderboardsResult.status === "fulfilled" ? leaderboardsResult.value : null;
        const personalRes = personalResult.status === "fulfilled" ? personalResult.value : null;
        const groupRes = groupResult.status === "fulfilled" ? groupResult.value : null;

        if (!cancelled) {
          setActionTypes(typesRes.actionTypes);
          setCoins(coinRes?.coins ?? null);
          setPet(petRes?.pet ?? null);
          setPetCatalog(catalogRes.pets || []);
          setEarnedBadges(earnedBadgesRes?.badges || []);
          setLeaderboardEntries(leaderboardsRes?.leaderboards || []);
          setPersonalChallenges(personalRes?.challenges || []);
          setGroupChallenges(groupRes?.challenges || []);
          setPetSetupType((current) => current || catalogRes.pets?.[0]?.pet_type || "");
          setPetSetupNickname((petRes?.pet?.nickname || user.display_name || user.username || "").trim());
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load action types.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.user_id]);

  useEffect(() => {
    let cancelled = false;
    async function loadLogs() {
      if (!user?.user_id) return;
      setLoading(true);
      setError(null);
      try {
        const start = dateKeys[0];
        const end = dateKeys[dateKeys.length - 1];
        const res = await getActionLogs(start, end);
        if (!cancelled) setLogs(res.logs || []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load action logs.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadLogs();
    return () => {
      cancelled = true;
    };
  }, [user?.user_id, dateKeys]);

  const filteredLogs = useMemo(() => {
    if (category === "all") return logs;
    return logs.filter((l) => actionTypeById.get(l.action_type_id)?.category === category);
  }, [logs, category, actionTypeById]);

  const totalsByDate = useMemo(() => {
    const map = new Map<string, number>();
    dateKeys.forEach((d) => map.set(d, 0));
    filteredLogs.forEach((l) => {
      const key = l.action_date.slice(0, 10);
      map.set(key, (map.get(key) || 0) + Number(l.calculated_co2e || 0));
    });
    return dateKeys.map((d) => ({ date: d, total: map.get(d) || 0 }));
  }, [filteredLogs, dateKeys]);

  const maxTotal = useMemo(
    () => Math.max(0, ...totalsByDate.map((d) => d.total)),
    [totalsByDate]
  );

  const totalKg = useMemo(
    () => totalsByDate.reduce((sum, d) => sum + d.total, 0),
    [totalsByDate]
  );
  const activeDays = useMemo(
    () => totalsByDate.filter((entry) => entry.total > 0).length,
    [totalsByDate]
  );
  const averageDailyKg = useMemo(
    () => (dateKeys.length > 0 ? totalKg / dateKeys.length : 0),
    [dateKeys.length, totalKg]
  );
  const hasChartData = totalKg > 0;
  const currentFocusLabel = category === "all" ? "All categories" : category;
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const currentPersonalChallenges = useMemo(
    () => personalChallenges.filter((challenge) => isCurrentChallenge(challenge, today)),
    [personalChallenges, today]
  );
  const currentGroupChallenges = useMemo(
    () => groupChallenges.filter((challenge) => isCurrentChallenge(challenge, today)),
    [groupChallenges, today]
  );
  const evidenceRequiredChallenges = useMemo(
    () =>
      [...currentPersonalChallenges, ...currentGroupChallenges].filter(
        (challenge) => challenge.rules?.evidence_required === true
      ).length,
    [currentGroupChallenges, currentPersonalChallenges]
  );
  const nextChallengeDeadline = useMemo(() => {
    const timed = [...currentPersonalChallenges, ...currentGroupChallenges].filter(
      (challenge) => Boolean(challenge.end_date)
    );

    if (timed.length === 0) return null;

    return timed.sort((a, b) => String(a.end_date).localeCompare(String(b.end_date)))[0] ?? null;
  }, [currentGroupChallenges, currentPersonalChallenges]);
  const leaderboardContext = useMemo(() => {
    if (!user?.user_id || leaderboardEntries.length === 0) {
      return {
        leader: null as UserLeaderboardEntry | null,
        current: null as UserLeaderboardEntry | null,
        below: null as UserLeaderboardEntry | null,
        currentRank: null as number | null,
      };
    }

    const leader = leaderboardEntries[0] ?? null;
    const currentIndex = leaderboardEntries.findIndex((entry) => entry.user_id === user.user_id);
    const current = currentIndex >= 0 ? leaderboardEntries[currentIndex] : null;
    const below =
      currentIndex >= 0 && currentIndex < leaderboardEntries.length - 1
        ? leaderboardEntries[currentIndex + 1]
        : null;

    return {
      leader,
      current,
      below,
      currentRank: currentIndex >= 0 ? currentIndex + 1 : null,
    };
  }, [leaderboardEntries, user?.user_id]);

  async function handleCreatePetFromDashboard() {
    const nickname = petSetupNickname.trim();
    if (!nickname) {
      setPetSetupError("Choose a nickname for your companion.");
      return;
    }
    if (!petSetupType) {
      setPetSetupError("Choose a companion type.");
      return;
    }

    setPetSetupSubmitting(true);
    setPetSetupError(null);
    try {
      const res = await createPet({
        pet_type: petSetupType,
        nickname,
      });
      setPet(res.pet);
      setPetSetupNickname(res.pet.nickname);
    } catch (err) {
      setPetSetupError(err instanceof Error ? err.message : "Could not create companion.");
    } finally {
      setPetSetupSubmitting(false);
    }
  }

  return (
    <>
      {!loading && !pet && user?.user_id ? (
        <PetSetupModal
          nickname={petSetupNickname}
          onChangeNickname={setPetSetupNickname}
          onChooseType={setPetSetupType}
          onSubmit={handleCreatePetFromDashboard}
          petCatalog={petCatalog}
          petType={petSetupType}
          submitting={petSetupSubmitting}
          error={petSetupError}
        />
      ) : null}

      <PageShell
        title="Dashboard"
        subtitle="Your main hub for carbon progress, companion status, and weekly momentum."
      >
      <div className="space-y-7">
        <section className="app-card overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="bg-[linear-gradient(135deg,rgba(221,243,229,0.95),rgba(245,236,215,0.72))] p-6">
            <div className="space-y-4 rounded-[1.6rem] bg-white/78 p-5 backdrop-blur">
              <div className="app-chip">Progress snapshot</div>
              <div>
                <h2 className="text-3xl font-semibold tracking-tight text-[rgb(var(--app-ink))]">
                  Hi {displayName}
                </h2>
                <p className="mt-2 max-w-md text-sm app-muted">
                  Here is your current low-carbon momentum across actions, pet progress, and
                  weekly consistency.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="app-stat">
                  <div className="text-xs uppercase tracking-wide app-muted">Current focus</div>
                  <div className="mt-1 text-base font-semibold text-[rgb(var(--app-ink))]">
                    {category === "all" ? "All categories" : category}
                  </div>
                </div>
                <div className="app-stat">
                  <div className="text-xs uppercase tracking-wide app-muted">Time window</div>
                  <div className="mt-1 text-base font-semibold text-[rgb(var(--app-ink))]">
                    Last {dateRange} days
                  </div>
                </div>
                <div className="app-stat">
                  <div className="text-xs uppercase tracking-wide app-muted">Actions logged</div>
                  <div className="mt-1 text-base font-semibold text-[rgb(var(--app-ink))]">
                    {filteredLogs.length}
                  </div>
                </div>
                <div className="app-stat">
                  <div className="text-xs uppercase tracking-wide app-muted">Active days</div>
                  <div className="mt-1 text-base font-semibold text-[rgb(var(--app-ink))]">
                    {activeDays} / {dateKeys.length}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to="/app/log-action" className="app-button-primary">
                  Log new action
                </Link>
                <Link to="/app/challenges" className="app-button-secondary">
                  View challenges
                </Link>
              </div>
            </div>
          </div>

          {pet ? (
            <div className="grid gap-3 p-6 sm:grid-cols-3">
              <div className="sm:col-span-3">
                <div className="app-card-soft flex items-center gap-4 p-4">
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[1.2rem] bg-white text-2xl font-semibold text-[rgb(var(--app-ink))]">
                    {pet.image_url ? (
                      <img
                        src={pet.image_url}
                        alt={pet.nickname}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      pet.nickname.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-[0.16em] app-muted">Pet companion</div>
                    <div className="truncate text-2xl font-semibold text-[rgb(var(--app-ink))]">
                      {pet.nickname}
                    </div>
                    <div className="text-sm app-muted">{pet.pet_type} companion</div>
                    <Link to="/app/pets" className="mt-2 inline-flex text-sm font-medium text-[rgb(var(--app-brand))] underline-offset-4 hover:underline">
                      Open pet hub
                    </Link>
                  </div>
                </div>
              </div>

              <div className="app-stat">
                <div className="text-xs uppercase tracking-wide app-muted">CG67coin</div>
                <div className="mt-1 text-2xl font-semibold text-[rgb(var(--app-ink))]">
                  {coins ?? 0}
                </div>
              </div>
              <div className="app-stat">
                <div className="text-xs uppercase tracking-wide app-muted">Pet streak</div>
                <div className="mt-1 text-2xl font-semibold text-[rgb(var(--app-ink))]">
                  {pet.streak}
                </div>
              </div>
              <div className="app-stat">
                <div className="text-xs uppercase tracking-wide app-muted">Status</div>
                <div
                  className={`mt-2 text-sm font-semibold ${
                    pet.status === "alive" ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {pet.status === "alive" ? "Alive and active" : "Needs revive"}
                </div>
              </div>

              <div className="app-stat sm:col-span-3">
                <div className="flex items-center justify-between text-xs uppercase tracking-wide app-muted">
                  <span>Energy</span>
                  <span>{pet.energy}%</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white">
                  <div
                    className="h-2 rounded-full bg-amber-400"
                    style={{ width: `${pet.energy}%` }}
                  />
                </div>
              </div>
              <div className="app-stat">
                <div className="text-xs uppercase tracking-wide app-muted">Average daily impact</div>
                <div className="mt-1 text-2xl font-semibold text-[rgb(var(--app-ink))]">
                  {averageDailyKg.toFixed(2)}
                </div>
                <div className="mt-1 text-xs app-muted">kg CO2e over the selected window</div>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="app-card-soft p-5">
                <div className="text-sm font-semibold text-[rgb(var(--app-ink))]">Companion setup in progress</div>
                <div className="mt-2 text-sm app-muted">
                  Finish choosing your companion to unlock pet stats, coin tracking, and dashboard boosts.
                </div>
              </div>
            </div>
          )}
        </div>
        </section>

        <section className="app-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="app-chip">Badges</div>
              <h2 className="mt-3 app-section-title">Recent achievements</h2>
              <p className="mt-2 text-sm app-muted">
                Keep an eye on what you’ve unlocked recently and how your progress is stacking up.
              </p>
            </div>
            <Link to="/app/profile" className="app-button-secondary">
              Open badge cabinet
            </Link>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="app-stat">
              <div className="text-xs uppercase tracking-wide app-muted">Earned total</div>
              <div className="mt-1 text-2xl font-semibold text-[rgb(var(--app-ink))]">
                {earnedBadges.length}
              </div>
            </div>
            {earnedBadges.slice(0, 3).map((entry) => (
              <div key={entry.user_badge_id} className="app-card-soft p-4">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-[1.1rem] bg-white">
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
                <div className="mt-1 text-xs app-muted">
                  {new Date(entry.earned_at).toLocaleDateString("en-GB")}
                </div>
              </div>
            ))}
            {earnedBadges.length === 0 ? (
              <div className="app-card-soft p-4 sm:col-span-2 xl:col-span-3">
                <div className="text-sm font-semibold text-[rgb(var(--app-ink))]">
                  No badges unlocked yet
                </div>
                <div className="mt-2 text-sm app-muted">
                  Your first badge will appear here once you build up enough actions, streaks, or approved submissions.
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <div className="app-card p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="app-chip">Group position</div>
                <h2 className="mt-3 app-section-title">Competitive snapshot</h2>
                <p className="mt-2 text-sm app-muted">
                  {user?.group_id
                    ? "Your current standing within your group leaderboard."
                    : "Join a group to unlock group-only leaderboard context."}
                </p>
              </div>
              <Link to="/app/leaderboards" className="app-button-secondary">
                Full rankings
              </Link>
            </div>

            {leaderboardContext.leader && leaderboardContext.current ? (
              <div className="mt-5 space-y-3">
                <div className="flex items-center gap-4 rounded-[1.5rem] border border-[rgb(var(--app-line))] bg-white p-4 shadow-sm">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-sm font-semibold text-amber-800">
                    #1
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs uppercase tracking-wide app-muted">1st place</div>
                    <div className="truncate text-lg font-semibold text-[rgb(var(--app-ink))]">
                      {leaderboardContext.leader.display_name || leaderboardContext.leader.username}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-wide app-muted">Points</div>
                    <div className="text-lg font-semibold text-[rgb(var(--app-ink))]">
                      {formatLeaderboardPoints(leaderboardContext.leader.points)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 rounded-[1.6rem] border border-transparent bg-[rgb(var(--app-brand))] p-4 text-white shadow-sm">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-sm font-semibold text-white">
                    #{leaderboardContext.currentRank}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs uppercase tracking-wide text-white/75">You</div>
                    <div className="truncate text-lg font-semibold">
                      {leaderboardContext.current.display_name || leaderboardContext.current.username}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-wide text-white/75">Points</div>
                    <div className="text-lg font-semibold">
                      {formatLeaderboardPoints(leaderboardContext.current.points)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 rounded-[1.5rem] border border-[rgb(var(--app-line))] bg-white p-4 shadow-sm">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[rgb(var(--app-soft))] text-sm font-semibold text-[rgb(var(--app-ink))]">
                    {leaderboardContext.below ? `#${(leaderboardContext.currentRank ?? 0) + 1}` : "--"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs uppercase tracking-wide app-muted">
                      {leaderboardContext.below ? "Directly below" : "Position edge"}
                    </div>
                    <div className="truncate text-lg font-semibold text-[rgb(var(--app-ink))]">
                      {leaderboardContext.below
                        ? leaderboardContext.below.display_name || leaderboardContext.below.username
                        : "No one below you"}
                    </div>
                    {!leaderboardContext.below ? (
                      <div className="mt-1 text-sm app-muted">
                        You’re holding the final visible spot in this leaderboard view.
                      </div>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-wide app-muted">Points</div>
                    <div className="text-lg font-semibold text-[rgb(var(--app-ink))]">
                      {leaderboardContext.below
                        ? formatLeaderboardPoints(leaderboardContext.below.points)
                        : "--"}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-[1.5rem] border border-dashed border-[rgb(var(--app-line))] bg-[rgb(var(--app-soft))]/60 p-5">
                <div className="text-sm font-semibold text-[rgb(var(--app-ink))]">
                  Ranking context not available yet
                </div>
                <div className="mt-2 text-sm app-muted">
                  Once your leaderboard data is available, this panel will show the leader, your rank, and who is just below you.
                </div>
              </div>
            )}
          </div>

          <div className="app-card p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="app-chip">Challenge status</div>
                <h2 className="mt-3 app-section-title">Current mission board</h2>
                <p className="mt-2 text-sm app-muted">
                  A quick read on what’s currently active and which challenges may need evidence.
                </p>
              </div>
              <Link to="/app/challenges" className="app-button-secondary">
                Open challenges
              </Link>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="app-stat">
                <div className="text-xs uppercase tracking-wide app-muted">Active personal</div>
                <div className="mt-1 text-2xl font-semibold text-[rgb(var(--app-ink))]">
                  {currentPersonalChallenges.length}
                </div>
              </div>
              <div className="app-stat">
                <div className="text-xs uppercase tracking-wide app-muted">Active group</div>
                <div className="mt-1 text-2xl font-semibold text-[rgb(var(--app-ink))]">
                  {currentGroupChallenges.length}
                </div>
              </div>
              <div className="app-stat">
                <div className="text-xs uppercase tracking-wide app-muted">Evidence needed</div>
                <div className="mt-1 text-2xl font-semibold text-[rgb(var(--app-ink))]">
                  {evidenceRequiredChallenges}
                </div>
              </div>
              <div className="app-stat">
                <div className="text-xs uppercase tracking-wide app-muted">Next deadline</div>
                <div className="mt-1 text-2xl font-semibold text-[rgb(var(--app-ink))]">
                  {nextChallengeDeadline ? formatShortDate(nextChallengeDeadline.end_date) : "None"}
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {currentPersonalChallenges[0] ? (
                <div className="app-card-soft p-4">
                  <div className="text-xs uppercase tracking-wide app-muted">Featured personal challenge</div>
                  <div className="mt-2 text-lg font-semibold text-[rgb(var(--app-ink))]">
                    {currentPersonalChallenges[0].title}
                  </div>
                  <div className="mt-1 text-sm app-muted">
                    Ends {formatShortDate(currentPersonalChallenges[0].end_date)}
                  </div>
                </div>
              ) : null}

              {currentGroupChallenges[0] ? (
                <div className="app-card-soft p-4">
                  <div className="text-xs uppercase tracking-wide app-muted">Featured group challenge</div>
                  <div className="mt-2 text-lg font-semibold text-[rgb(var(--app-ink))]">
                    {currentGroupChallenges[0].title}
                  </div>
                  <div className="mt-1 text-sm app-muted">
                    Ends {formatShortDate(currentGroupChallenges[0].end_date)}
                  </div>
                </div>
              ) : null}

              {currentPersonalChallenges.length === 0 && currentGroupChallenges.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-[rgb(var(--app-line))] bg-[rgb(var(--app-soft))]/60 p-5">
                  <div className="text-sm font-semibold text-[rgb(var(--app-ink))]">
                    No active challenges right now
                  </div>
                  <div className="mt-2 text-sm app-muted">
                    Check the challenges area to browse past events or see when the next set opens.
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="app-card p-6">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="app-chip">Carbon journey</div>
            <h2 className="app-section-title">Estimated impact over time</h2>
            <p className="text-sm app-muted">
              {dateRange === 7 ? "Last 7 days" : "Last 30 days"} based on logged actions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="space-y-1 text-xs font-medium uppercase tracking-[0.14em] app-muted">
              <span>Range</span>
              <select
                className="block rounded-xl border border-[rgb(var(--app-line))] bg-white px-3 py-2 text-sm normal-case tracking-normal text-[rgb(var(--app-ink))]"
                value={dateRange}
                onChange={(e) => setDateRange(Number(e.target.value) as DateRangeOption)}
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
              </select>
            </label>

            <label className="space-y-1 text-xs font-medium uppercase tracking-[0.14em] app-muted">
              <span>Category</span>
              <select
                className="block rounded-xl border border-[rgb(var(--app-line))] bg-white px-3 py-2 text-sm normal-case tracking-normal text-[rgb(var(--app-ink))]"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === "all" ? "All categories" : c}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="rounded-[1.5rem] bg-[rgb(var(--app-soft))] p-4">
              <div className="h-4 w-40 animate-pulse rounded-full bg-white/90" />
              <div className="mt-3 h-3 w-64 animate-pulse rounded-full bg-white/70" />
              <div className="mt-6 flex h-52 items-end gap-2">
                {Array.from({ length: 7 }).map((_, index) => (
                  <div key={index} className="flex flex-1 flex-col items-center gap-2">
                    <div
                      className="w-full animate-pulse rounded-t-xl bg-white/75"
                      style={{ height: `${24 + index * 10}%` }}
                    />
                    <div className="h-2 w-8 animate-pulse rounded-full bg-white/65" />
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="app-stat">
                  <div className="h-3 w-20 animate-pulse rounded-full bg-[rgb(var(--app-soft))]" />
                  <div className="mt-3 h-6 w-24 animate-pulse rounded-full bg-[rgb(var(--app-soft))]" />
                </div>
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : !hasChartData ? (
          <div className="rounded-[1.5rem] border border-dashed border-[rgb(var(--app-line))] bg-[rgb(var(--app-soft))]/60 p-6">
            <div className="app-chip">No activity yet</div>
            <h3 className="mt-4 text-xl font-semibold text-[rgb(var(--app-ink))]">
              Start logging actions to build your impact timeline
            </h3>
            <p className="mt-2 max-w-2xl text-sm app-muted">
              Once you add a few actions, this chart will show your estimated CO2e trend across the selected date range.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/app/log-action" className="app-button-primary">
                Log your first action
              </Link>
              <Link to="/app/challenges" className="app-button-secondary">
                Browse challenges
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-[1.5rem] bg-[rgb(var(--app-soft))] p-4">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[rgb(var(--app-ink))]">
                    Daily carbon trend
                  </div>
                  <div className="text-xs app-muted">
                    Bars show estimated impact by day for the selected filter.
                  </div>
                </div>
                <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[rgb(var(--app-ink))] shadow-sm">
                  Peak day: {maxTotal.toFixed(2)} kg CO2e
                </div>
              </div>
              <div className="flex h-52 items-end gap-2">
                {totalsByDate.map((d) => {
                  const height = maxTotal > 0 ? Math.max(6, (d.total / maxTotal) * 100) : 6;
                  return (
                    <div key={d.date} className="flex flex-1 flex-col items-center gap-2">
                      <div className="flex h-36 w-full items-end">
                        <div
                          className="w-full rounded-t-xl bg-[rgb(var(--app-brand))]/75"
                          style={{ height: `${height}%` }}
                          title={`${d.total.toFixed(3)} kg CO2e`}
                        />
                      </div>
                      <div className="text-[10px] font-medium text-gray-500">
                        {formatDateLabel(d.date)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <div className="app-stat">
                <div className="text-xs uppercase tracking-wide app-muted">Total</div>
                <div className="mt-1 text-xl font-semibold text-[rgb(var(--app-ink))]">
                  {totalKg.toFixed(3)} kg CO2e
                </div>
              </div>
              <div className="app-stat">
                <div className="text-xs uppercase tracking-wide app-muted">Category</div>
                <div className="mt-1 text-xl font-semibold text-[rgb(var(--app-ink))]">
                  {currentFocusLabel}
                </div>
              </div>
              <div className="app-stat">
                <div className="text-xs uppercase tracking-wide app-muted">Average per day</div>
                <div className="mt-1 text-xl font-semibold text-[rgb(var(--app-ink))]">
                  {averageDailyKg.toFixed(3)} kg CO2e
                </div>
              </div>
              <div className="app-stat">
                <div className="text-xs uppercase tracking-wide app-muted">Active days</div>
                <div className="mt-1 text-xl font-semibold text-[rgb(var(--app-ink))]">
                  {activeDays}
                </div>
              </div>
              <div className="app-stat">
                <div className="text-xs uppercase tracking-wide app-muted">Confidence</div>
                <div className="mt-1 text-xl font-semibold text-emerald-700">Medium</div>
                <div className="mt-1 text-xs app-muted">Estimates can vary by context.</div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="app-card-soft p-5">
                <div className="text-xs uppercase tracking-wide app-muted">Current interpretation</div>
                <div className="mt-2 text-lg font-semibold text-[rgb(var(--app-ink))]">
                  {activeDays >= Math.ceil(dateKeys.length / 2)
                    ? "You’re building a steady routine."
                    : "There’s room to build consistency."}
                </div>
                <p className="mt-2 text-sm app-muted">
                  {activeDays >= Math.ceil(dateKeys.length / 2)
                    ? "You’ve logged impact on most days in this window, which is a strong base for challenges and streaks."
                    : "Logging actions on more days will make your dashboard trend more meaningful and help your companion stay active."}
                </p>
              </div>
              <div className="app-card-soft p-5">
                <div className="text-xs uppercase tracking-wide app-muted">Next move</div>
                <div className="mt-2 text-lg font-semibold text-[rgb(var(--app-ink))]">
                  Keep momentum visible
                </div>
                <p className="mt-2 text-sm app-muted">
                  Try logging one more action in your most common category or jump into a challenge to convert progress into points.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link to="/app/log-action" className="app-button-secondary">
                    Add activity
                  </Link>
                  <Link to="/app/leaderboards" className="app-button-secondary">
                    Check rankings
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
        </section>
      </div>
      </PageShell>
    </>
  );
}
