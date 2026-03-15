import { useEffect, useMemo, useState } from "react";
import { getDemoUser } from "../auth/demoAuth";
import { apiFetch } from "../api/client";
import { getActionLogs } from "../api/actionLogs";
import type { ActionType, GetActionTypesResponse } from "../api/types";
import { ensureGamificationState, getPetDisplay } from "../gamification/store";

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

export default function DashboardPage() {
  const user = getDemoUser();
  const displayName = user?.display_name || user?.username || "there";
  const petState = user?.user_id ? ensureGamificationState(user.user_id) : null;
  const petDisplay = petState ? getPetDisplay(petState.pet.nickname) : null;

  const [actionTypes, setActionTypes] = useState<ActionType[]>([]);
  const [logs, setLogs] = useState<
    Array<{
      log_id: string | number;
      action_type_id: string | number;
      action_date: string;
      calculated_co2e: number;
    }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        const typesRes = await apiFetch<GetActionTypesResponse>("/action-types");
        if (!cancelled) setActionTypes(typesRes.actionTypes);
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
        const res = await getActionLogs(user.user_id, start, end);
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

  return (
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
              <div className="grid gap-3 sm:grid-cols-2">
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
              </div>
            </div>
          </div>

          {petState && petDisplay ? (
            <div className="grid gap-3 p-6 sm:grid-cols-3">
              <div className="sm:col-span-3">
                <div className="app-card-soft flex items-center gap-4 p-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-[1.2rem] bg-white text-2xl font-semibold text-[rgb(var(--app-ink))]">
                    {petDisplay.avatarLabel}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-[0.16em] app-muted">Pet companion</div>
                    <div className="truncate text-2xl font-semibold text-[rgb(var(--app-ink))]">
                      {petState.pet.nickname}
                    </div>
                    <div className="text-sm app-muted">{petDisplay.tagline}</div>
                  </div>
                </div>
              </div>

              <div className="app-stat">
                <div className="text-xs uppercase tracking-wide app-muted">CG67coin</div>
                <div className="mt-1 text-2xl font-semibold text-[rgb(var(--app-ink))]">
                  {petState.coins}
                </div>
              </div>
              <div className="app-stat">
                <div className="text-xs uppercase tracking-wide app-muted">Pet streak</div>
                <div className="mt-1 text-2xl font-semibold text-[rgb(var(--app-ink))]">
                  {petState.pet.streakDays}
                </div>
              </div>
              <div className="app-stat">
                <div className="text-xs uppercase tracking-wide app-muted">Status</div>
                <div
                  className={`mt-2 text-sm font-semibold ${
                    petState.pet.status === "alive" ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {petState.pet.status === "alive" ? "Alive and active" : "Needs revive"}
                </div>
              </div>

              <div className="app-stat sm:col-span-3">
                <div className="flex items-center justify-between text-xs uppercase tracking-wide app-muted">
                  <span>Energy</span>
                  <span>{petState.pet.energy}%</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white">
                  <div
                    className="h-2 rounded-full bg-amber-400"
                    style={{ width: `${petState.pet.energy}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="app-card-soft p-5">
                <div className="text-sm font-semibold text-[rgb(var(--app-ink))]">Pet sync pending</div>
                <div className="mt-2 text-sm app-muted">
                  Your pet profile will appear here once companion data is available.
                </div>
              </div>
            </div>
          )}
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
            <select
              className="rounded-xl border border-[rgb(var(--app-line))] bg-white px-3 py-2 text-sm text-[rgb(var(--app-ink))]"
              value={dateRange}
              onChange={(e) => setDateRange(Number(e.target.value) as DateRangeOption)}
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
            </select>

            <select
              className="rounded-xl border border-[rgb(var(--app-line))] bg-white px-3 py-2 text-sm text-[rgb(var(--app-ink))]"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === "all" ? "All categories" : c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-sm app-muted">Loading chart...</div>
        ) : error ? (
          <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : (
          <>
            <div className="rounded-[1.5rem] bg-[rgb(var(--app-soft))] p-4">
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

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="app-stat">
                <div className="text-xs uppercase tracking-wide app-muted">Total</div>
                <div className="mt-1 text-xl font-semibold text-[rgb(var(--app-ink))]">
                  {totalKg.toFixed(3)} kg CO2e
                </div>
              </div>
              <div className="app-stat">
                <div className="text-xs uppercase tracking-wide app-muted">Category</div>
                <div className="mt-1 text-xl font-semibold text-[rgb(var(--app-ink))]">
                  {category === "all" ? "All" : category}
                </div>
              </div>
              <div className="app-stat">
                <div className="text-xs uppercase tracking-wide app-muted">Confidence</div>
                <div className="mt-1 text-xl font-semibold text-emerald-700">Medium</div>
                <div className="mt-1 text-xs app-muted">Estimates can vary by context.</div>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
