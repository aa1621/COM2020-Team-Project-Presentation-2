import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api/client";
import { getCoinBalance } from "../api/coins";
import { getActionLogs } from "../api/actionLogs";
import { useAuth } from "../auth/AuthProvider";
import { createPet, getMyPet, getPetCatalog } from "../api/pets";
import type { ActionType, GetActionTypesResponse, Pet, PetCatalogEntry } from "../api/types";

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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.52)] p-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl overflow-hidden rounded-[2rem] border border-white/60 bg-[linear-gradient(145deg,rgba(244,252,246,0.98),rgba(255,248,234,0.98))] shadow-[0_30px_90px_rgba(15,23,42,0.24)]">
        <div className="grid gap-0 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="bg-[linear-gradient(160deg,rgba(16,185,129,0.18),rgba(250,204,21,0.15))] p-6 lg:p-8">
            <div className="app-chip bg-white/80">Companion setup</div>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-[rgb(var(--app-ink))]">
              Choose your first campus companion
            </h2>
            <p className="mt-4 max-w-md text-sm leading-7 app-muted">
              Pick a starter pet and give it a name before you start tracking progress.
            </p>
          </div>

          <div className="p-6 lg:p-8">
            <div className="grid gap-4 md:grid-cols-3">
              {petCatalog.map((option) => (
                <button
                  key={option.pet_type}
                  type="button"
                  onClick={() => onChooseType(option.pet_type)}
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

            <input
              className="mt-6 w-full rounded-[1.35rem] border border-[rgb(var(--app-line))] bg-white px-4 py-3 text-sm text-[rgb(var(--app-ink))]"
              value={nickname}
              onChange={(e) => onChangeNickname(e.target.value)}
              placeholder="Companion nickname"
            />

            {error && (
              <div className="mt-4 rounded-[1.2rem] bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={onSubmit}
              disabled={submitting}
              className="mt-6 rounded-[1.35rem] bg-[rgb(var(--app-ink))] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
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
        const [typesRes, coinRes, petRes, catalogRes] = await Promise.all([
          apiFetch<GetActionTypesResponse>("/action-types"),
          getCoinBalance(),
          getMyPet().catch((err) => {
            if (isMissingPetError(err)) return null;
            throw err;
          }),
          getPetCatalog(),
        ]);
        if (!cancelled) {
          setActionTypes(typesRes.actionTypes);
          setCoins(coinRes.coins);
          setPet(petRes?.pet ?? null);
          setPetCatalog(catalogRes.pets || []);
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
            </div>
          ) : (
            <div className="p-6">
              <div className="app-card-soft p-5">
                <div className="text-sm font-semibold text-[rgb(var(--app-ink))]">Pet profile unavailable</div>
                <div className="mt-2 text-sm app-muted">
                  Create a companion in the pet hub to see its status and coin balance here.
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
    </>
  );
}
