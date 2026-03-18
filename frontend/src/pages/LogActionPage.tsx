import { useEffect, useMemo, useState } from "react";
import PageShell from "../components/PageShell";
import { createActionLog } from "../api/actionLogs";
import { apiFetch } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import type {
  ActionType,
  CreateActionLogResponse,
  GetActionTypesResponse,
} from "../api/types";

export default function LogActionPage() {
  const { user } = useAuth();
  const [actionTypes, setActionTypes] = useState<ActionType[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("1");

  const [result, setResult] = useState<CreateActionLogResponse | null>(null);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => actionTypes.find((a) => a.key === selectedKey) ?? null,
    [actionTypes, selectedKey]
  );

  useEffect(() => {
    async function loadActionTypes() {
      setLoadingTypes(true);
      setError(null);
      try {
        const res = await apiFetch<GetActionTypesResponse>("/action-types");
        setActionTypes(res.actionTypes);

        if (res.actionTypes.length > 0) {
          setSelectedKey(res.actionTypes[0].key);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load action types");
      } finally {
        setLoadingTypes(false);
      }
    }

    loadActionTypes();
  }, []);

  async function onSubmit() {
    setError(null);
    setResult(null);

    const qty = Number(quantity);
    if (!user?.user_id) return setError("Please sign in to submit an action.");
    if (!selectedKey) return setError("Please select an action.");
    if (!Number.isFinite(qty) || qty <= 0) {
      return setError("Quantity must be a positive number.");
    }

    setSubmitting(true);
    try {
      const res = await createActionLog({
        action_type_key: selectedKey,
        quantity: qty,
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell
      title="Log action"
      subtitle="Record a real-world sustainability action and immediately see both the estimate and your companion reward."
    >
      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <section className="app-card p-6">
          <div className="space-y-5">
            <div>
              <div className="app-chip">Action input</div>
              <h2 className="mt-3 app-section-title">Submit a sustainability action</h2>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide app-muted">
                Action
              </label>

              {loadingTypes ? (
                <div className="text-sm app-muted">Loading actions...</div>
              ) : (
                <select
                  className="w-full rounded-2xl border border-[rgb(var(--app-line))] bg-white px-4 py-3 text-sm text-[rgb(var(--app-ink))]"
                  value={selectedKey}
                  onChange={(e) => setSelectedKey(e.target.value)}
                >
                  {actionTypes.map((a) => (
                    <option key={a.key} value={a.key}>
                      {a.category} - {a.name} ({a.unit})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide app-muted">
                Quantity {selected ? `(${selected.unit})` : ""}
              </label>
              <input
                className="w-full rounded-2xl border border-[rgb(var(--app-line))] bg-white px-4 py-3 text-sm text-[rgb(var(--app-ink))]"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g., 3"
              />
            </div>

            <button
              onClick={onSubmit}
              disabled={submitting || loadingTypes}
              className="w-full rounded-2xl bg-[rgb(var(--app-ink))] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit action"}
            </button>

            {error && (
              <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</div>
            )}
          </div>
        </section>

        <section className="app-card p-6">
          <div className="space-y-4">
            <div>
              <div className="app-chip">Transparency panel</div>
              <h2 className="mt-3 app-section-title">How we estimate this</h2>
            </div>

            {!result ? (
              <div className="app-card-soft p-5 text-sm app-muted">
                Pick an action and submit to see the backend calculation and your pet reward.
              </div>
            ) : (
              <div className="space-y-4 text-sm text-[rgb(var(--app-ink))]">
                <div className="rounded-[1.5rem] bg-[rgb(var(--app-brand-soft))] p-5">
                  <div className="text-base font-semibold text-[rgb(var(--app-ink))]">
                    Estimated: {result.calculation.estimateKgCO2e.toFixed(3)} kg CO2e
                  </div>
                  <div className="mt-2 text-xs app-muted">
                    Range: {result.calculation.rangeKgCO2e.min.toFixed(3)} to{" "}
                    {result.calculation.rangeKgCO2e.max.toFixed(3)} kg CO2e
                  </div>
                </div>

                <div className="app-card-soft p-5">
                  <div className="text-xs font-semibold uppercase tracking-wide app-muted">
                    Logged
                  </div>
                  <div className="mt-2 text-sm text-[rgb(var(--app-ink))]">
                    {result.actionType.name} - {result.log.quantity} {result.actionType.unit} -
                    score {result.log.score}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="app-stat">
                    <div className="text-xs uppercase tracking-wide app-muted">Confidence</div>
                    <div className="mt-1 text-lg font-semibold text-[rgb(var(--app-ink))]">
                      {result.calculation.confidence}
                    </div>
                  </div>
                  <div className="app-stat">
                    <div className="text-xs uppercase tracking-wide app-muted">Caveat</div>
                    <div className="mt-1 text-sm app-muted">{result.calculation.caveat}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
