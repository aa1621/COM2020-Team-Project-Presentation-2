import { useEffect, useMemo, useState } from "react";
import PageShell from "../components/PageShell";
import { apiFetch } from "../api/client";
import { getDemoUserId } from "../auth/demoAuth";
import {
  applyActionLogReward,
  type ActionRewardResult,
} from "../gamification/store";
import type {
  ActionType,
  CreateActionLogResponse,
  GetActionTypesResponse,
} from "../api/types";

export default function LogActionPage() {
  const [actionTypes, setActionTypes] = useState<ActionType[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("1");

  const [result, setResult] = useState<CreateActionLogResponse | null>(null);
  const [rewardResult, setRewardResult] = useState<ActionRewardResult | null>(null);
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
    setRewardResult(null);

    const qty = Number(quantity);
    const demoUserId = getDemoUserId();
    if (!demoUserId) return setError("Please sign in to submit an action.");
    if (!selectedKey) return setError("Please select an action.");
    if (!Number.isFinite(qty) || qty <= 0) {
      return setError("Quantity must be a positive number.");
    }

    setSubmitting(true);
    try {
      const res = await apiFetch<CreateActionLogResponse>("/action-logs", {
        method: "POST",
        headers: { "x-user-id": demoUserId },
        body: JSON.stringify({
          action_type_key: selectedKey,
          quantity: qty,
        }),
      });

      setResult(res);
      setRewardResult(applyActionLogReward(demoUserId, res.log.score));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell
      title="Log action"
      subtitle="Log a real-world action and see how the estimate is calculated."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-gray-100 bg-white/80 p-6 shadow-sm">
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-700">Action</label>

            {loadingTypes ? (
              <div className="text-sm text-gray-600">Loading actions...</div>
            ) : (
              <select
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm"
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
            <label className="text-xs font-medium text-gray-700">
              Quantity {selected ? `(${selected.unit})` : ""}
            </label>
            <input
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g., 3"
            />
          </div>

          <button
            onClick={onSubmit}
            disabled={submitting || loadingTypes}
            className="w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>

          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white/80 p-6 shadow-sm">
          <div className="text-sm font-medium text-gray-900">How we estimate this</div>

          {!result ? (
            <p className="mt-2 text-sm text-gray-700">
              Pick an action and submit to see the backend calculation.
            </p>
          ) : (
            <div className="mt-4 space-y-3 text-sm text-gray-700">
              <div className="rounded-xl bg-green-50 p-4">
                <div className="font-medium text-gray-900">
                  Estimated: {result.calculation.estimateKgCO2e.toFixed(3)} kg CO2e
                </div>
                <div className="mt-1 text-xs text-gray-600">
                  Range: {result.calculation.rangeKgCO2e.min.toFixed(3)}-
                  {result.calculation.rangeKgCO2e.max.toFixed(3)} kg CO2e
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 bg-white p-4">
                <div className="text-xs font-medium text-gray-900">Logged</div>
                <div className="mt-1 text-xs text-gray-600">
                  {result.actionType.name} - {result.log.quantity} {result.actionType.unit} -
                  score {result.log.score}
                </div>
              </div>

              {rewardResult && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                    Pet reward
                  </div>
                  <div className="mt-2 text-sm font-medium text-gray-900">
                    Your pet enjoyed that sustainable action.
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-xl bg-white px-3 py-2 text-xs text-gray-700">
                      +{rewardResult.coinsEarned} CG67coin
                    </div>
                    <div className="rounded-xl bg-white px-3 py-2 text-xs text-gray-700">
                      +{rewardResult.happinessGain}% happiness
                    </div>
                    <div className="rounded-xl bg-white px-3 py-2 text-xs text-gray-700">
                      +{rewardResult.energyGain}% energy
                    </div>
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-600">
                <span className="font-medium">Confidence:</span>{" "}
                {result.calculation.confidence}
              </div>
              <div className="text-xs text-gray-600">{result.calculation.caveat}</div>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
