import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageShell from "../components/PageShell";
import { useAuth } from "../auth/AuthProvider";
import { getCoinBalance } from "../api/coins";
import { getInventory } from "../api/inventory";
import { buyShopItem, getShopItems } from "../api/shop";
import type { InventoryItem, ShopItem } from "../api/types";
import { resolveGameAssetUrl } from "../utils/gameAssetUrl";

function isMissingPetError(error: unknown) {
  return error instanceof Error && /no pet found|user has no pet/i.test(error.message);
}

function InsufficientFundsModal({
  item,
  coins,
  onClose,
}: {
  item: ShopItem;
  coins: number;
  onClose: () => void;
}) {
  const shortfall = Math.max(0, item.coin_cost - coins);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.52)] p-4 backdrop-blur-sm"
      role="presentation"
    >
      <div
        className="w-full max-w-4xl overflow-hidden rounded-[2rem] border border-white/60 bg-[linear-gradient(145deg,rgba(255,245,245,0.98),rgba(255,248,234,0.98))] shadow-[0_30px_90px_rgba(15,23,42,0.24)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="insufficient-funds-title"
        aria-describedby="insufficient-funds-description"
      >
        <div className="grid gap-0 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="bg-[linear-gradient(160deg,rgba(248,113,113,0.18),rgba(250,204,21,0.16))] p-6 lg:p-8">
            <div className="app-chip bg-white/80 text-rose-700">Purchase blocked</div>
            <h2
              id="insufficient-funds-title"
              className="mt-4 text-4xl font-semibold tracking-tight text-[rgb(var(--app-ink))]"
            >
              Your companion wallet is empty
            </h2>
            <p
              id="insufficient-funds-description"
              className="mt-4 max-w-md text-sm leading-7 app-muted"
            >
              You need more CG67coin before you can buy this item.
            </p>
          </div>

          <div className="p-6 lg:p-8">
            <div className="rounded-[1.6rem] border border-rose-100 bg-white/85 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-600">
                Selected item
              </div>
              <div className="mt-3 text-2xl font-semibold text-[rgb(var(--app-ink))]">
                {item.name}
              </div>
              <div className="mt-2 text-sm app-muted">
                {item.description || "Cosmetic accessory for your companion."}
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.35rem] border border-[rgb(var(--app-line))] bg-white p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] app-muted">
                  Price
                </div>
                <div className="mt-2 text-2xl font-semibold text-[rgb(var(--app-ink))]">
                  {item.coin_cost}
                </div>
              </div>
              <div className="rounded-[1.35rem] border border-[rgb(var(--app-line))] bg-white p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] app-muted">
                  Balance
                </div>
                <div className="mt-2 text-2xl font-semibold text-[rgb(var(--app-ink))]">
                  {coins}
                </div>
              </div>
              <div className="rounded-[1.35rem] border border-[rgb(var(--app-line))] bg-white p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] app-muted">
                  Missing
                </div>
                <div className="mt-2 text-2xl font-semibold text-rose-600">
                  {shortfall}
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-[1.35rem] bg-rose-50 px-4 py-3 text-sm text-rose-700">
              Log more actions to earn enough coin, then come back and try again.
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/app/log-action"
                className="rounded-2xl bg-[rgb(var(--app-ink))] px-5 py-3 text-sm font-semibold text-white"
                onClick={onClose}
              >
                Earn more coin
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-[rgb(var(--app-line))] bg-white px-5 py-3 text-sm font-semibold text-[rgb(var(--app-ink))]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ShopPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [coins, setCoins] = useState<number | null>(null);
  const [hasPet, setHasPet] = useState(true);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [insufficientFundsItem, setInsufficientFundsItem] = useState<ShopItem | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadShop() {
      if (!user?.user_id) return;
      setLoading(true);
      setError(null);

      try {
        const [shopRes, coinRes] = await Promise.all([getShopItems(), getCoinBalance()]);
        if (cancelled) return;

        setItems(shopRes.items || []);
        setCoins(coinRes.coins);

        try {
          const inventoryRes = await getInventory();
          if (!cancelled) {
            setInventory(inventoryRes.inventory || []);
            setHasPet(true);
          }
        } catch (err) {
          if (!cancelled) {
            if (isMissingPetError(err)) {
              setInventory([]);
              setHasPet(false);
            } else {
              throw err;
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load shop.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadShop();
    return () => {
      cancelled = true;
    };
  }, [user?.user_id]);

  const ownedItemIds = useMemo(
    () => new Set(inventory.map((entry) => entry.items.item_id)),
    [inventory]
  );

  async function refreshInventory() {
    try {
      const inventoryRes = await getInventory();
      setInventory(inventoryRes.inventory || []);
      setHasPet(true);
    } catch (err) {
      if (isMissingPetError(err)) {
        setInventory([]);
        setHasPet(false);
        return;
      }
      throw err;
    }
  }

  async function handleBuy(item: ShopItem) {
    setBuyingId(item.item_id);
    setError(null);
    setMessage(null);
    setInsufficientFundsItem(null);
    try {
      const res = await buyShopItem(item.item_id);
      setCoins(res.new_coin_balance);
      await refreshInventory();
      setMessage(res.message);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Purchase failed.";
      if (/not enough coins/i.test(message)) {
        setInsufficientFundsItem(item);
      } else {
        setError(message);
      }
    } finally {
      setBuyingId(null);
    }
  }

  if (!user) {
    return (
      <PageShell title="Shop" subtitle="Sign in to spend your CG67coin.">
        <div className="app-card p-6 text-sm app-muted">You need to be signed in to access the shop.</div>
      </PageShell>
    );
  }

  if (loading) {
    return (
      <PageShell title="Shop" subtitle="Loading your inventory...">
        <div className="app-card p-6 text-sm app-muted">Loading shop...</div>
      </PageShell>
    );
  }

  return (
    <>
      {insufficientFundsItem && coins !== null ? (
        <InsufficientFundsModal
          item={insufficientFundsItem}
          coins={coins}
          onClose={() => setInsufficientFundsItem(null)}
        />
      ) : null}

      <PageShell
        title="Shop"
        subtitle="Spend your balance on pet accessories and upgrades."
        right={
          <div className="rounded-full bg-[rgb(var(--app-ink))] px-4 py-2 text-sm font-semibold text-white">
            Balance: {coins ?? 0} CG67coin
          </div>
        }
      >
      <div className="grid gap-6 xl:grid-cols-[1fr_0.38fr]">
        <section className="grid gap-4 md:grid-cols-2">
          {items.map((item) => {
            const owned = ownedItemIds.has(item.item_id);
            const isBuying = buyingId === item.item_id;

            return (
              <div key={item.item_id} className="app-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="app-chip">{item.category}</div>
                    <div className="mt-3 text-xl font-semibold text-[rgb(var(--app-ink))]">
                      {item.name}
                    </div>
                  </div>
                  <div className="rounded-full bg-[rgb(var(--app-soft))] px-3 py-2 text-xs font-semibold text-[rgb(var(--app-ink))]">
                    {item.coin_cost} coin
                  </div>
                </div>
                <p className="mt-4 text-sm app-muted">
                  {item.description || "Cosmetic accessory for your companion."}
                </p>
                {resolveGameAssetUrl(item.image_url) ? (
                  <div className="mt-4 flex justify-center rounded-[1.25rem] bg-[rgb(var(--app-soft))] p-4">
                    <img
                      src={resolveGameAssetUrl(item.image_url) || undefined}
                      alt={item.name}
                      className="h-24 w-24 object-contain"
                    />
                  </div>
                ) : null}
                <div className="mt-4 rounded-[1.25rem] bg-[rgb(var(--app-soft))] p-3 text-xs app-muted">
                  {item.rarity ? `Rarity: ${item.rarity}` : "Standard item"}
                </div>
                <button
                  type="button"
                  onClick={() => handleBuy(item)}
                  disabled={!hasPet || isBuying || owned}
                  className="mt-5 w-full rounded-2xl bg-[rgb(var(--app-brand))] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-45"
                >
                  {!hasPet ? "Create pet first" : owned ? "Owned" : isBuying ? "Buying..." : "Buy now"}
                </button>
              </div>
            );
          })}
        </section>

        <aside className="space-y-4">
          <div className="app-card p-5">
            <div className="app-chip">Shop status</div>
            <div className="mt-3 space-y-2 text-sm app-muted">
              <div>{items.length} active items available.</div>
              <div>{inventory.length} inventory entries owned.</div>
              <div>{hasPet ? "Pet profile found." : "No pet profile yet."}</div>
            </div>
          </div>

          {!hasPet && (
            <div className="rounded-[1.75rem] border border-amber-100 bg-amber-50 p-5 text-sm text-amber-800">
              Create your pet first before buying accessories.
              <div className="mt-4">
                <Link
                  to="/app/pets"
                  className="inline-block rounded-2xl bg-[rgb(var(--app-ink))] px-4 py-2 font-semibold text-white"
                >
                  Open pet hub
                </Link>
              </div>
            </div>
          )}

          <div className="rounded-[1.75rem] bg-[rgb(var(--app-ink))] p-5 text-white shadow-sm">
            <div className="text-sm font-semibold">Pet hub</div>
            <p className="mt-2 text-sm text-gray-300">
              Items you buy here can be equipped from the pet page.
            </p>
            <Link
              to="/app/pets"
              className="mt-4 inline-block rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-[rgb(var(--app-ink))]"
            >
              Back to pet hub
            </Link>
          </div>

          {error && (
            <div className="rounded-[1.75rem] border border-red-100 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}
          {message && (
            <div className="rounded-[1.75rem] border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
              {message}
            </div>
          )}
        </aside>
      </div>
      </PageShell>
    </>
  );
}
