import { useEffect, useMemo, useState } from "react";
import PageShell from "../components/PageShell";
import { useAuth } from "../auth/AuthProvider";
import { getCoinBalance } from "../api/coins";
import { equipInventoryItem, getInventory, unequipInventoryItem } from "../api/inventory";
import { createPet, getMyPet, getPetCatalog, revivePet, updatePetNickname } from "../api/pets";
import type { InventoryItem, Pet, PetCatalogEntry } from "../api/types";

function isMissingPetError(error: unknown) {
  return error instanceof Error && /no pet found|user has no pet/i.test(error.message);
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

function getPetMood(pet: Pet) {
  if (pet.status !== "alive") {
    return {
      label: "Needs revive",
      chip: "bg-rose-100 text-rose-700",
      summary: "Your companion is down and needs coins to recover.",
    };
  }

  const average = (pet.health + pet.happiness + pet.energy) / 3;
  if (average >= 80) {
    return {
      label: "Thriving",
      chip: "bg-emerald-100 text-emerald-700",
      summary: "Everything looks stable and healthy.",
    };
  }
  if (average >= 50) {
    return {
      label: "Steady",
      chip: "bg-sky-100 text-sky-700",
      summary: "Your pet is in decent shape with room to improve.",
    };
  }
  return {
    label: "Low",
    chip: "bg-amber-100 text-amber-700",
    summary: "Stats are dropping and need attention soon.",
  };
}

function StatCard({
  label,
  value,
  tint,
}: {
  label: string;
  value: number;
  tint: string;
}) {
  return (
    <div className="rounded-[1.4rem] border border-[rgb(var(--app-line))] bg-white p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] app-muted">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-[rgb(var(--app-ink))]">{value}%</div>
      <div className="mt-3 h-2 rounded-full bg-[rgb(var(--app-soft))]">
        <div className={`h-2 rounded-full ${tint}`} style={{ width: `${clamp(value)}%` }} />
      </div>
    </div>
  );
}

export default function PetsPage() {
  const { user } = useAuth();
  const [pet, setPet] = useState<Pet | null>(null);
  const [petCatalog, setPetCatalog] = useState<PetCatalogEntry[]>([]);
  const [coins, setCoins] = useState<number | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [adoptType, setAdoptType] = useState("");
  const [adoptNickname, setAdoptNickname] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadPetHub() {
      if (!user?.user_id) return;
      setLoading(true);
      setError(null);

      try {
        const [{ coins: coinBalance }, petRes, catalogRes] = await Promise.all([
          getCoinBalance(),
          getMyPet().catch((err) => {
            if (isMissingPetError(err)) return null;
            throw err;
          }),
          getPetCatalog(),
        ]);

        if (cancelled) return;

        setCoins(coinBalance);
        setPetCatalog(catalogRes.pets || []);
        setAdoptType((current) => current || catalogRes.pets?.[0]?.pet_type || "");

        if (!petRes) {
          setPet(null);
          setInventory([]);
          return;
        }

        setPet(petRes.pet);
        setNicknameDraft(petRes.pet.nickname);

        try {
          const inventoryRes = await getInventory();
          if (!cancelled) {
            setInventory(inventoryRes.inventory || []);
          }
        } catch (err) {
          if (!cancelled && !isMissingPetError(err)) {
            throw err;
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load pet hub.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPetHub();
    return () => {
      cancelled = true;
    };
  }, [user?.user_id]);

  const equippedItems = useMemo(() => inventory.filter((entry) => entry.equipped), [inventory]);
  const mood = pet ? getPetMood(pet) : null;

  async function refreshInventory() {
    try {
      const res = await getInventory();
      setInventory(res.inventory || []);
    } catch (err) {
      if (!isMissingPetError(err)) {
        throw err;
      }
      setInventory([]);
    }
  }

  async function handleCreatePet() {
    if (!adoptType) {
      setError("Choose a starter pet first.");
      return;
    }
    setCreating(true);
    setError(null);
    setMessage(null);
    try {
      const res = await createPet({
        pet_type: adoptType,
        nickname: adoptNickname.trim() || undefined,
      });
      setPet(res.pet);
      setNicknameDraft(res.pet.nickname);
      setAdoptNickname("");
      await refreshInventory();
      setMessage(`${res.pet.nickname} is now linked to your account.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create pet.");
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveNickname() {
    if (!pet) return;
    const trimmed = nicknameDraft.trim();
    if (!trimmed) {
      setError("Pet nickname is required.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await updatePetNickname(trimmed);
      setPet({ ...pet, nickname: trimmed });
      setMessage("Pet nickname saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update nickname.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRevive() {
    if (!pet) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await revivePet();
      setPet(res.pet);
      setCoins(res.new_coin_balance);
      setMessage(`Your companion has been revived for ${res.coins_spent} CG67coin.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not revive pet.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleEquip(item: InventoryItem) {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      if (item.equipped) {
        await unequipInventoryItem(item.items.item_id);
        setMessage(`${item.items.name} unequipped.`);
      } else {
        await equipInventoryItem(item.items.item_id);
        setMessage(`${item.items.name} equipped.`);
      }
      await refreshInventory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update inventory.");
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return (
      <PageShell title="Pets" subtitle="Sign in to view your campus companion.">
        <div className="app-card p-6 text-sm app-muted">You need to be signed in to manage your pet.</div>
      </PageShell>
    );
  }

  if (loading) {
    return (
      <PageShell title="Pets" subtitle="Loading your companion...">
        <div className="app-card p-6 text-sm app-muted">Loading pet data...</div>
      </PageShell>
    );
  }

  if (!pet) {
    return (
      <PageShell title="Pets" subtitle="Adopt a companion and start building its profile.">
        <div className="grid gap-6 xl:grid-cols-[1fr_0.42fr]">
          <section className="app-card p-6">
            <div className="app-chip">Adoption</div>
            <h2 className="mt-3 app-section-title">Choose your starter pet</h2>
            <p className="mt-3 text-sm leading-7 app-muted">
              Pick a starter type and give your companion a name to begin its journey.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {petCatalog.map((option) => (
                <button
                  key={option.pet_type}
                  type="button"
                  onClick={() => setAdoptType(option.pet_type)}
                  className={`rounded-[1.6rem] border p-5 text-left transition ${
                    adoptType === option.pet_type
                      ? "border-transparent bg-[rgb(var(--app-brand))] text-white shadow-sm"
                      : "border-[rgb(var(--app-line))] bg-white text-[rgb(var(--app-ink))]"
                  }`}
                >
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
              value={adoptNickname}
              onChange={(e) => setAdoptNickname(e.target.value)}
              placeholder="Optional nickname"
            />

            <button
              type="button"
              onClick={handleCreatePet}
              disabled={creating}
              className="mt-4 rounded-[1.35rem] bg-[rgb(var(--app-ink))] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {creating ? "Creating companion..." : "Create pet"}
            </button>
          </section>

          <aside className="space-y-4">
            <div className="app-card p-5">
              <div className="app-chip">Account status</div>
              <div className="mt-3 text-2xl font-semibold text-[rgb(var(--app-ink))]">
                {coins ?? 0} CG67coin
              </div>
              <div className="mt-2 text-sm app-muted">
                Your balance is ready for pet care and shop items.
              </div>
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
    );
  }

  return (
    <PageShell
      title="Pets"
      subtitle="Manage your companion, its wellbeing, and its inventory."
      right={
        <div className="rounded-full bg-[rgb(var(--app-ink))] px-4 py-2 text-sm font-semibold text-white">
          Balance: {coins ?? 0} CG67coin
        </div>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_0.42fr]">
        <section className="space-y-6">
          <div className="app-card overflow-hidden">
            <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="bg-[linear-gradient(145deg,rgba(221,243,229,0.95),rgba(245,236,215,0.72))] p-6">
                <div className="rounded-[1.6rem] bg-white/80 p-5">
                  <div className="app-chip">Companion profile</div>
                  <div className="mt-4 flex items-center gap-4">
                    {pet.image_url ? (
                      <img
                        src={pet.image_url}
                        alt={pet.nickname}
                        className="h-24 w-24 rounded-[1.4rem] object-cover"
                      />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-[1.4rem] bg-white text-2xl font-semibold text-[rgb(var(--app-ink))]">
                        {pet.nickname.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="truncate text-3xl font-semibold text-[rgb(var(--app-ink))]">
                        {pet.nickname}
                      </div>
                      <div className="mt-1 text-sm uppercase tracking-[0.18em] app-muted">
                        {pet.pet_type}
                      </div>
                      {mood && (
                        <div className={`mt-3 inline-flex rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-wide ${mood.chip}`}>
                          {mood.label}
                        </div>
                      )}
                    </div>
                  </div>
                  {mood && <div className="mt-4 text-sm app-muted">{mood.summary}</div>}
                </div>
              </div>

              <div className="grid gap-4 p-6 md:grid-cols-3">
                <StatCard label="Health" value={pet.health} tint="bg-emerald-500" />
                <StatCard label="Happiness" value={pet.happiness} tint="bg-sky-500" />
                <StatCard label="Energy" value={pet.energy} tint="bg-amber-500" />
                <div className="app-stat md:col-span-3">
                  <div className="text-xs uppercase tracking-wide app-muted">Progress</div>
                  <div className="mt-2 grid gap-3 sm:grid-cols-3">
                    <div>
                      <div className="text-2xl font-semibold text-[rgb(var(--app-ink))]">{pet.level}</div>
                      <div className="text-xs app-muted">Level</div>
                    </div>
                    <div>
                      <div className="text-2xl font-semibold text-[rgb(var(--app-ink))]">{pet.xp}</div>
                      <div className="text-xs app-muted">XP</div>
                    </div>
                    <div>
                      <div className="text-2xl font-semibold text-[rgb(var(--app-ink))]">{pet.streak}</div>
                      <div className="text-xs app-muted">Streak</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="app-card p-6">
              <div className="app-chip">Identity studio</div>
              <h2 className="mt-3 app-section-title">Rename your companion</h2>
              <input
                className="mt-5 w-full rounded-[1.35rem] border border-[rgb(var(--app-line))] bg-white px-4 py-3 text-sm text-[rgb(var(--app-ink))]"
                value={nicknameDraft}
                onChange={(e) => setNicknameDraft(e.target.value)}
                placeholder="Pet nickname"
              />
              <button
                type="button"
                onClick={handleSaveNickname}
                disabled={saving}
                className="mt-4 rounded-[1.35rem] bg-[rgb(var(--app-brand))] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save nickname"}
              </button>

              <div className="mt-6 rounded-[1.35rem] bg-[rgb(var(--app-soft))] p-4 text-sm app-muted">
                Adopted on {new Date(pet.adopted_at).toLocaleDateString()}. Status:
                <span className="ml-1 font-semibold text-[rgb(var(--app-ink))]">{pet.status}</span>.
              </div>
            </div>

            <div className="app-card p-6">
              <div className="app-chip">Care controls</div>
              <h2 className="mt-3 app-section-title">Revive when needed</h2>
              <p className="mt-3 text-sm leading-7 app-muted">
                If your companion goes down, revive it here and get it moving again.
              </p>
              <button
                type="button"
                onClick={handleRevive}
                disabled={saving || pet.status === "alive"}
                className="mt-5 rounded-[1.35rem] bg-[rgb(var(--app-ink))] px-5 py-3 text-sm font-semibold text-white disabled:opacity-45"
              >
                {saving ? "Updating..." : "Revive pet"}
              </button>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="app-stat">
                  <div className="text-xs uppercase tracking-wide app-muted">Active accessories</div>
                  <div className="mt-1 text-xl font-semibold text-[rgb(var(--app-ink))]">
                    {equippedItems.length}
                  </div>
                </div>
                <div className="app-stat">
                  <div className="text-xs uppercase tracking-wide app-muted">Inventory entries</div>
                  <div className="mt-1 text-xl font-semibold text-[rgb(var(--app-ink))]">
                    {inventory.length}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="app-card p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="app-chip">Equipped loadout</div>
                  <h2 className="mt-3 app-section-title">Active accessories</h2>
                </div>
                <div className="rounded-full bg-[rgb(var(--app-soft))] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--app-ink))]">
                  {equippedItems.length} active
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {equippedItems.length === 0 ? (
                  <div className="sm:col-span-2 rounded-[1.35rem] border border-dashed border-[rgb(var(--app-line))] bg-[rgb(var(--app-soft))] p-5 text-sm app-muted">
                    Nothing is equipped yet. Buy items in the shop, then equip them here.
                  </div>
                ) : (
                  equippedItems.map((entry) => (
                    <div key={entry.pet_item_id} className="rounded-[1.35rem] border border-[rgb(var(--app-line))] bg-white p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] app-muted">
                        {entry.items.category}
                      </div>
                      <div className="mt-2 text-base font-semibold text-[rgb(var(--app-ink))]">
                        {entry.items.name}
                      </div>
                      <div className="mt-2 text-sm app-muted">
                        {entry.items.description || "Cosmetic accessory"}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="app-card p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="app-chip">Inventory</div>
                  <h2 className="mt-3 app-section-title">Owned items</h2>
                </div>
                <div className="rounded-full bg-[rgb(var(--app-soft))] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--app-ink))]">
                  {inventory.length} owned
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {inventory.length === 0 ? (
                  <div className="rounded-[1.35rem] border border-dashed border-[rgb(var(--app-line))] bg-[rgb(var(--app-soft))] p-5 text-sm app-muted">
                    No inventory yet. Visit the shop to buy your first accessory.
                  </div>
                ) : (
                  inventory.map((entry) => (
                    <div key={entry.pet_item_id} className="rounded-[1.35rem] border border-[rgb(var(--app-line))] bg-[rgb(var(--app-soft))] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] app-muted">
                            {entry.items.category}
                          </div>
                          <div className="mt-2 text-base font-semibold text-[rgb(var(--app-ink))]">
                            {entry.items.name}
                          </div>
                          <div className="mt-1 text-sm app-muted">
                            {entry.items.description || "Cosmetic accessory"}
                          </div>
                          <div className="mt-2 text-xs app-muted">
                            Quantity {entry.quantity}
                            {entry.items.rarity ? ` • ${entry.items.rarity}` : ""}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleEquip(entry)}
                          disabled={saving}
                          className="rounded-xl border border-[rgb(var(--app-line))] bg-white px-3 py-2 text-xs font-semibold text-[rgb(var(--app-ink))] disabled:opacity-50"
                        >
                          {entry.equipped ? "Unequip" : "Equip"}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
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
  );
}
