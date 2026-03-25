import { useEffect, useMemo, useState } from "react";
import PageShell from "../components/PageShell";
import ActionModal from "../components/ActionModal";
import { useAuth } from "../auth/AuthProvider";
import { getCoinBalance } from "../api/coins";
import { equipInventoryItem, getInventory, unequipInventoryItem } from "../api/inventory";
import { createPet, getMyPet, getPetCatalog, revivePet, updatePetNickname } from "../api/pets";
import type { InventoryItem, Pet, PetCatalogEntry } from "../api/types";
import { resolveGameAssetUrl } from "../utils/gameAssetUrl";

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
  // was going to add a streak bonus mood but it made the thresholds confusing
  // if (pet.streak >= 7 && average >= 60) {
  //   return { label: "On a roll!", chip: "bg-violet-100 text-violet-700", summary: "A full week streak - keep it going." };
  // }
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

const ACCESSORY_LAYER_ORDER: Record<string, number> = {
  background: 0,
  body: 5,
  clothing: 10,
  shoes: 20,
  accessory: 30,
  glasses: 40,
  hair: 50,
  hat: 60,
};

function getAccessoryLayerOrder(category: string | null | undefined) {
  if (!category) return 25;
  return ACCESSORY_LAYER_ORDER[category.toLowerCase()] ?? 25;
}

function getDefaultPetNickname(displayName: string | null | undefined, username: string | null | undefined) {
  const baseName = (displayName || username || "Student").trim();
  return `${baseName}'s Pet`;
}

function PetAvatar({
  pet,
  equippedItems,
}: {
  pet: Pet;
  equippedItems: InventoryItem[];
}) {
  const petImageUrl = resolveGameAssetUrl(pet.image_url);
  const layeredItems = [...equippedItems]
    .filter((entry) => Boolean(resolveGameAssetUrl(entry.items.image_url)))
    .sort(
      (a, b) =>
        getAccessoryLayerOrder(a.items.category) -
        getAccessoryLayerOrder(b.items.category)
    );

  return (
    <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-[1.6rem] bg-white shadow-sm">
      {petImageUrl ? (
        <img
          src={petImageUrl}
          alt={pet.nickname}
          className="absolute inset-0 h-full w-full object-contain"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-[rgb(var(--app-ink))]">
          {pet.nickname.slice(0, 2).toUpperCase()}
        </div>
      )}

      {petImageUrl &&
        layeredItems.map((entry) => (
          <img
            key={entry.pet_item_id}
            src={resolveGameAssetUrl(entry.items.image_url) || undefined}
            alt={entry.items.name}
            className="pointer-events-none absolute inset-0 h-full w-full object-contain"
            style={{ zIndex: getAccessoryLayerOrder(entry.items.category) + 1 }}
          />
        ))}
    </div>
  );
}

type NoticeState =
  | {
      tone: "success" | "danger" | "warning";
      chip: string;
      title: string;
      description: string;
      body?: string;
    }
  | null;

export default function PetsPage() {
  const { user } = useAuth();
  const [pet, setPet] = useState<Pet | null>(null);
  const [petCatalog, setPetCatalog] = useState<PetCatalogEntry[]>([]);
  const [coins, setCoins] = useState<number | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [adoptType, setAdoptType] = useState("");
  const [adoptNickname, setAdoptNickname] = useState("");
  const [notice, setNotice] = useState<NoticeState>(null);
  const [showRevivePrompt, setShowRevivePrompt] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPetHub() {
      if (!user?.user_id) return;
      setLoading(true);
      setError(null);

      try {
        // console.log("loading pet hub for", user.user_id);
        const [coinResult, petResult, catalogResult] = await Promise.allSettled([
          getCoinBalance(),
          getMyPet().catch((err) => {
            if (isMissingPetError(err)) return null;
            throw err;
          }),
          getPetCatalog(),
        ]);

        if (catalogResult.status === "rejected") {
          throw catalogResult.reason;
        }

        const coinBalance = coinResult.status === "fulfilled" ? coinResult.value.coins : null;
        const petRes = petResult.status === "fulfilled" ? petResult.value : null;
        const catalogRes = catalogResult.value;

        if (cancelled) return;

        setCoins(coinBalance);
        setPetCatalog(catalogRes.pets || []);
        setAdoptType((current) => current || catalogRes.pets?.[0]?.pet_type || "");
        setAdoptNickname((current) =>
          current || getDefaultPetNickname(user?.display_name, user?.username)
        );

        if (!petRes) {
          setPet(null);
          setInventory([]);
          setShowRevivePrompt(false);
          return;
        }

        setPet(petRes.pet);
        setNicknameDraft(petRes.pet.nickname);
        if (petRes.pet.status !== "alive") {
          console.warn("pet is not alive, status:", petRes.pet.status);
        }
        setShowRevivePrompt(petRes.pet.status !== "alive");

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

  function showNotice(nextNotice: Exclude<NoticeState, null>) {
    setNotice(nextNotice);
  }

  async function handleCreatePet() {
    if (!adoptType) {
      setError("Choose a starter pet first.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await createPet({
        pet_type: adoptType,
        nickname: adoptNickname.trim() || undefined,
      });
      setPet(res.pet);
      setNicknameDraft(res.pet.nickname);
      setAdoptNickname("");
      setShowRevivePrompt(false);
      await refreshInventory();
      showNotice({
        tone: "success",
        chip: "Pet created",
        title: `${res.pet.nickname} is ready`,
        description: "Your new companion is now linked to your account.",
        body: "You can rename it, buy items, and manage equipment from this page.",
      });
    } catch (err) {
      showNotice({
        tone: "danger",
        chip: "Could not create pet",
        title: "The pet was not created",
        description: err instanceof Error ? err.message : "Could not create pet.",
      });
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveNickname() {
    if (!pet) return;
    const trimmed = nicknameDraft.trim();
    if (!trimmed) {
      showNotice({
        tone: "warning",
        chip: "Name required",
        title: "Add a nickname first",
        description: "Your pet needs a name before you can save this change.",
      });
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await updatePetNickname(trimmed);
      setPet({ ...pet, nickname: trimmed });
      showNotice({
        tone: "success",
        chip: "Nickname saved",
        title: "Pet name updated",
        description: `${trimmed} is now the active nickname for this companion.`,
      });
    } catch (err) {
      showNotice({
        tone: "danger",
        chip: "Could not save",
        title: "The nickname was not updated",
        description: err instanceof Error ? err.message : "Could not update nickname.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleRevive() {
    if (!pet) return;
    setSaving(true);
    setError(null);
    try {
      const res = await revivePet();
      setPet(res.pet);
      setCoins(res.new_coin_balance);
      setShowRevivePrompt(false);
      showNotice({
        tone: "success",
        chip: "Pet revived",
        title: `${res.pet.nickname} is back`,
        description: `Your companion has been revived for ${res.coins_spent} CG67coin.`,
        body: `New balance: ${res.new_coin_balance} CG67coin.`,
      });
    } catch (err) {
      showNotice({
        tone: "danger",
        chip: "Revive failed",
        title: "The pet could not be revived",
        description: err instanceof Error ? err.message : "Could not revive pet.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleEquip(item: InventoryItem) {
    setSaving(true);
    setError(null);
    try {
      if (item.equipped) {
        await unequipInventoryItem(item.pet_item_id);
        await refreshInventory();
        showNotice({
          tone: "success",
          chip: "Item removed",
          title: `${item.items.name} unequipped`,
          description: "The item was removed from your pet's current loadout.",
        });
      } else {
        await equipInventoryItem(item.pet_item_id);
        await refreshInventory();
        showNotice({
          tone: "success",
          chip: "Item equipped",
          title: `${item.items.name} equipped`,
          description: "Your pet is now wearing this item.",
        });
      }
    } catch (err) {
      showNotice({
        tone: "danger",
        chip: "Inventory update failed",
        title: "The item could not be updated",
        description: err instanceof Error ? err.message : "Could not update inventory.",
      });
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
      <>
        {notice ? (
          <ActionModal
            chip={notice.chip}
            title={notice.title}
            description={notice.description}
            tone={notice.tone}
            onClose={() => setNotice(null)}
            actions={
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="rounded-2xl bg-[rgb(var(--app-ink))] px-5 py-3 text-sm font-semibold text-white"
              >
                Close
              </button>
            }
          >
            {notice.body ? (
              <div className="rounded-[1.35rem] border border-[rgb(var(--app-line))] bg-white/85 p-5 text-sm app-muted">
                {notice.body}
              </div>
            ) : null}
          </ActionModal>
        ) : null}

        <PageShell title="Pets" subtitle="Adopt a companion and start building its profile.">
          <div className="grid gap-6 xl:grid-cols-[1.12fr_0.42fr]">
            <section className="app-card p-6">
              <div className="app-chip">Adoption</div>
              <h2 className="mt-3 app-section-title">Choose your starter pet</h2>
              <p className="mt-3 text-sm leading-7 app-muted">
                Pick a starter type and give your companion a name to begin its journey.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {petCatalog.map((option) => (
                  <button
                    key={option.pet_type}
                    type="button"
                    onClick={() => setAdoptType(option.pet_type)}
                    className={`aspect-square rounded-[1.6rem] border p-4 text-left transition ${
                      adoptType === option.pet_type
                        ? "border-transparent bg-[rgb(var(--app-brand))] text-white shadow-sm"
                        : "border-[rgb(var(--app-line))] bg-white text-[rgb(var(--app-ink))]"
                    } flex flex-col`}
                  >
                    <div className="aspect-square overflow-hidden rounded-[1.2rem] bg-[rgb(var(--app-soft))]">
                      {resolveGameAssetUrl(option.image_url) ? (
                        <img
                          src={resolveGameAssetUrl(option.image_url) || undefined}
                          alt={option.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-3xl font-semibold">
                          {option.name.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] opacity-80">
                      Starter
                    </div>
                    <div className="mt-2 text-2xl font-semibold">{option.name}</div>
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
            </aside>
          </div>
        </PageShell>
      </>
    );
  }

  return (
    <>
      {showRevivePrompt && pet.status !== "alive" ? (
        <ActionModal
          chip="Pet revive"
          title={`${pet.nickname} needs help`}
          description="Your companion is currently down. You can revive it now or close this and decide later."
          tone="warning"
          onClose={() => setShowRevivePrompt(false)}
          actions={
            <>
              <button
                type="button"
                onClick={handleRevive}
                disabled={saving}
                className="rounded-2xl bg-[rgb(var(--app-ink))] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Reviving..." : "Revive pet"}
              </button>
              <button
                type="button"
                onClick={() => setShowRevivePrompt(false)}
                className="rounded-2xl border border-[rgb(var(--app-line))] bg-white px-5 py-3 text-sm font-semibold text-[rgb(var(--app-ink))]"
              >
                Maybe later
              </button>
            </>
          }
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.35rem] border border-[rgb(var(--app-line))] bg-white p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] app-muted">
                Balance
              </div>
              <div className="mt-2 text-2xl font-semibold text-[rgb(var(--app-ink))]">
                {coins ?? 0}
              </div>
            </div>
            <div className="rounded-[1.35rem] border border-[rgb(var(--app-line))] bg-white p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] app-muted">
                Status
              </div>
              <div className="mt-2 text-2xl font-semibold text-rose-600">
                {pet.status}
              </div>
            </div>
            <div className="rounded-[1.35rem] border border-[rgb(var(--app-line))] bg-white p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] app-muted">
                Streak
              </div>
              <div className="mt-2 text-2xl font-semibold text-[rgb(var(--app-ink))]">
                {pet.streak}
              </div>
            </div>
          </div>
        </ActionModal>
      ) : null}

      {notice ? (
        <ActionModal
          chip={notice.chip}
          title={notice.title}
          description={notice.description}
          tone={notice.tone}
          onClose={() => setNotice(null)}
          actions={
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="rounded-2xl bg-[rgb(var(--app-ink))] px-5 py-3 text-sm font-semibold text-white"
            >
              Close
            </button>
          }
        >
          {notice.body ? (
            <div className="rounded-[1.35rem] border border-[rgb(var(--app-line))] bg-white/85 p-5 text-sm app-muted">
              {notice.body}
            </div>
          ) : null}
        </ActionModal>
      ) : null}

      <PageShell
        title="Pets"
        subtitle="Check your pet, rename it, and manage what it has equipped."
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
                    <div className="app-chip">Pet</div>
                    <div className="mt-4 flex items-center gap-4">
                      <PetAvatar pet={pet} equippedItems={equippedItems} />
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
                <div className="app-chip">Revive</div>
                <h2 className="mt-3 app-section-title">Bring your pet back if needed</h2>
                <p className="mt-3 text-sm leading-7 app-muted">
                  If your companion goes down, revive it here and get it moving again.
                </p>
                <button
                  type="button"
                  onClick={() => setShowRevivePrompt(true)}
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

              <div className="app-card p-6">
                <div className="app-chip">Rename</div>
                <h2 className="mt-3 app-section-title">Update your pet's name</h2>
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
            </div>

            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="app-card p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="app-chip">Equipped</div>
                    <h2 className="mt-3 app-section-title">Currently wearing</h2>
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
          </aside>
        </div>
      </PageShell>
    </>
  );
}
