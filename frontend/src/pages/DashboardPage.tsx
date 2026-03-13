import { useEffect, useMemo, useState } from "react";
import { getDemoUser } from "../auth/demoAuth";
import { apiFetch } from "../api/client";
import { getActionLogs } from "../api/actionLogs";
import type { ActionType, GetActionTypesResponse } from "../api/types";
import { ensureGamificationState, getPetTemplate } from "../gamification/store";

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
  const petTemplate = petState ? getPetTemplate(petState.pet.templateId) : null;

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
    <div className="space-y-6">
      {/* Page heading */}
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-gray-900">Hi {displayName}</h1>
        <p className="text-sm text-gray-600">Here is your sustainability progress so far.</p>
      </header>

      {petState && petTemplate ? (
        <section className="overflow-hidden rounded-[2rem] border border-emerald-100 bg-white shadow-sm">
          <div className={`grid gap-0 lg:grid-cols-[0.95fr_1.05fr]`}>
            <div className={`bg-gradient-to-br ${petTemplate.accentClass} p-6`}>
              <div className="flex items-center gap-4 rounded-[1.5rem] bg-white/70 p-4 backdrop-blur">
                <img
                  src={petTemplate.image}
                  alt={petTemplate.name}
                  className="h-24 w-24 rounded-[1.25rem] bg-white object-cover"
                />
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-gray-600">
                    Pet companion
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-gray-950">
                    {petState.pet.nickname}
                  </div>
                  <div className="mt-1 text-sm text-gray-700">{petTemplate.tagline}</div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 p-6 sm:grid-cols-3">
              <div className="rounded-2xl bg-gray-50 p-4">
                <div className="text-xs text-gray-500">CG67coin</div>
                <div className="mt-1 text-2xl font-semibold text-gray-950">{petState.coins}</div>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <div className="text-xs text-gray-500">Pet streak</div>
                <div className="mt-1 text-2xl font-semibold text-gray-950">
                  {petState.pet.streakDays} days
                </div>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <div className="text-xs text-gray-500">Status</div>
                <div
                  className={`mt-1 text-sm font-semibold ${
                    petState.pet.status === "alive" ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {petState.pet.status === "alive" ? "Alive and active" : "Needs revive"}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:col-span-3">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Energy</span>
                  <span>{petState.pet.energy}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-amber-400"
                    style={{ width: `${petState.pet.energy}%` }}
                  />
                </div>
                <div className="mt-3 text-xs text-gray-600">
                  Your pet system is now visible from the dashboard and ready to be linked to real
                  actions and challenge rewards later.
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Chart card */}
      <section className="rounded-2xl border border-gray-100 bg-white/80 p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-green-200/70" />
            <div>
              <h2 className="text-lg font-medium text-gray-900">Your carbon journey</h2>
              <p className="text-xs text-gray-500">
                {dateRange === 7 ? "Last 7 days" : "Last 30 days"} based on logged actions
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700"
              value={dateRange}
              onChange={(e) => setDateRange(Number(e.target.value) as DateRangeOption)}
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
            </select>

            <select
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700"
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
          <div className="text-sm text-gray-600">Loading chart...</div>
        ) : error ? (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>
        ) : (
          <>
            <div className="flex h-44 items-end gap-2">
              {totalsByDate.map((d) => {
                const height =
                  maxTotal > 0 ? Math.max(4, (d.total / maxTotal) * 100) : 4;
                return (
                  <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex h-32 w-full items-end">
                      <div
                        className="w-full rounded-md bg-green-200/80"
                        style={{ height: `${height}%` }}
                        title={`${d.total.toFixed(3)} kg CO2e`}
                      />
                    </div>
                    <div className="text-[10px] text-gray-500">{formatDateLabel(d.date)}</div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex flex-col gap-2 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-700">
                  Total: {totalKg.toFixed(3)} kg CO2e
                </span>
                <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-700">
                  Category: {category === "all" ? "all" : category}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full bg-green-100 px-2 py-1 text-green-800">
                  Confidence: Medium
                </span>
                <span className="hidden sm:inline">|</span>
                <span>Estimates can vary by context.</span>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
