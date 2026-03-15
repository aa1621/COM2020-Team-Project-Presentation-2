import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageShell from "../components/PageShell";
import { getDemoUser } from "../auth/demoAuth";
import {
  ensureGamificationState,
  purchaseShopItem,
  SHOP_ITEMS,
  type GamificationState,
} from "../gamification/store";

export default function ShopPage() {
  const user = getDemoUser();
  const [state, setState] = useState<GamificationState | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.user_id) return;
    setState(ensureGamificationState(user.user_id));
  }, [user?.user_id]);

  if (!user) {
    return (
      <PageShell title="Shop" subtitle="Sign in to spend your CG67coin.">
        <div className="app-card p-6 text-sm app-muted">
          You need to be signed in to access the shop.
        </div>
      </PageShell>
    );
  }

  if (!state) {
    return (
      <PageShell title="Shop" subtitle="Loading your inventory...">
        <div className="app-card p-6 text-sm app-muted">Loading shop...</div>
      </PageShell>
    );
  }

  const currentUser = user;

  function handleBuy(itemId: string) {
    const result = purchaseShopItem(currentUser.user_id, itemId);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }

    setState(result.state);
    setMessage(
      result.item.id === "revive-token"
        ? "Revive token used or banked successfully."
        : `${result.item.name} added to your pet inventory.`
    );
  }

  return (
    <PageShell
      title="Shop"
      subtitle="Spend CG67coin on upgrades, cosmetic gear, and revive support for your companion."
      right={
        <div className="rounded-full bg-[rgb(var(--app-ink))] px-4 py-2 text-sm font-semibold text-white">
          Balance: {state.coins} CG67coin
        </div>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_0.38fr]">
        <section className="grid gap-4 md:grid-cols-2">
          {SHOP_ITEMS.map((item) => {
            const owned = state.inventoryItemIds.includes(item.id);
            const isRevive = item.id === "revive-token";

            return (
              <div key={item.id} className="app-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="app-chip">{item.slot}</div>
                    <div className="mt-3 text-xl font-semibold text-[rgb(var(--app-ink))]">
                      {item.name}
                    </div>
                  </div>
                  <div className="rounded-full bg-[rgb(var(--app-soft))] px-3 py-2 text-xs font-semibold text-[rgb(var(--app-ink))]">
                    {item.price} coin
                  </div>
                </div>
                <p className="mt-4 text-sm app-muted">{item.description}</p>
                <div className="mt-4 rounded-[1.25rem] bg-[rgb(var(--app-soft))] p-3 text-xs app-muted">
                  {item.effect}
                </div>
                <button
                  type="button"
                  onClick={() => handleBuy(item.id)}
                  disabled={!isRevive && owned}
                  className="mt-5 w-full rounded-2xl bg-[rgb(var(--app-brand))] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-45"
                >
                  {!isRevive && owned ? "Owned" : "Buy now"}
                </button>
              </div>
            );
          })}
        </section>

        <aside className="space-y-4">
          <div className="app-card p-5">
            <div className="app-chip">Loop overview</div>
            <div className="mt-3 space-y-2 text-sm app-muted">
              <div>1. Your pet profile is created from stored account data.</div>
              <div>2. Earn coins from sustainable actions and challenge progress.</div>
              <div>3. Spend them on upgrades, cosmetics, and recovery support.</div>
              <div>4. Keep your companion active through consistent engagement.</div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-rose-100 bg-rose-50 p-5">
            <div className="text-sm font-semibold text-rose-900">Revive rule</div>
            <div className="mt-2 text-sm text-rose-700">
              Current frontend assumption: revival costs `PS5` worth of `CG67coin`, represented as
              a 500-coin revive action.
            </div>
          </div>

          <div className="rounded-[1.75rem] bg-[rgb(var(--app-ink))] p-5 text-white shadow-sm">
            <div className="text-sm font-semibold">Pet hub link-up</div>
            <p className="mt-2 text-sm text-gray-300">
              When you buy an accessory here, it is ready to appear in the pet hub loadout.
            </p>
            <Link
              to="/app/pets"
              className="mt-4 inline-block rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-[rgb(var(--app-ink))]"
            >
              Back to pet hub
            </Link>
          </div>

          {message && (
            <div className="rounded-[1.75rem] border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
              {message}
            </div>
          )}
        </aside>
      </div>
    </PageShell>
  );
}
