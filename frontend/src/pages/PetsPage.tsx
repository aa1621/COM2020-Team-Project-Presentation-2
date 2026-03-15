import { useEffect, useState } from "react";
import PageShell from "../components/PageShell";
import { getDemoUser } from "../auth/demoAuth";
import {
  ensureGamificationState,
  getEarnedBadges,
  getOwnedShopItems,
  getPetDisplay,
  revivePetWithCoins,
  saveGamificationState,
  SHOP_ITEMS,
  setPetStatus,
  toggleEquipItem,
  type GamificationState,
} from "../gamification/store";

function StatBar({
  label,
  value,
  tint,
}: {
  label: string;
  value: number;
  tint: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs uppercase tracking-wide app-muted">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-white">
        <div className={`h-2 rounded-full ${tint}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function PetsPage() {
  const user = getDemoUser();
  const [state, setState] = useState<GamificationState | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.user_id) return;
    setState(ensureGamificationState(user.user_id));
  }, [user?.user_id]);

  if (!user) {
    return (
      <PageShell title="Pets" subtitle="Sign in to view your campus companion.">
        <div className="app-card p-6 text-sm app-muted">
          You need to be signed in to manage your pet.
        </div>
      </PageShell>
    );
  }

  if (!state) {
    return (
      <PageShell title="Pets" subtitle="Loading your companion...">
        <div className="app-card p-6 text-sm app-muted">Loading pet data...</div>
      </PageShell>
    );
  }

  const currentUser = user;
  const currentState = state;
  const petDisplay = getPetDisplay(currentState.pet.nickname);
  const earnedBadges = getEarnedBadges(currentState);
  const ownedItems = getOwnedShopItems(currentState);
  const equippedItems = SHOP_ITEMS.filter((item) =>
    currentState.pet.equippedItemIds.includes(item.id)
  );

  function refresh(nextState: GamificationState | null, nextMessage?: string) {
    if (nextState) setState(nextState);
    setMessage(nextMessage ?? null);
  }

  function handleNicknameChange(nickname: string) {
    setState({
      ...currentState,
      pet: {
        ...currentState.pet,
        nickname,
      },
    });
  }

  function handleNicknameSave() {
    saveGamificationState(currentUser.user_id, currentState);
    setMessage("Pet nickname saved.");
  }

  function handleRevive() {
    const result = revivePetWithCoins(currentUser.user_id);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    refresh(result.state, "Your pet is back and ready for more climate missions.");
  }

  function handleEquip(itemId: string) {
    const nextState = toggleEquipItem(currentUser.user_id, itemId);
    refresh(nextState, "Accessory loadout updated.");
  }

  function handleDemoPetDown() {
    const nextState = setPetStatus(currentUser.user_id, "needs-revive");
    refresh(nextState, "Demo state: your pet now needs reviving.");
  }

  function handleRestoreDemo() {
    const nextState = setPetStatus(currentUser.user_id, "alive");
    if (nextState) {
      const restoredState = {
        ...nextState,
        pet: {
          ...nextState.pet,
          health: 80,
          energy: 72,
        },
      };
      saveGamificationState(currentUser.user_id, restoredState);
      refresh(restoredState, "Demo state restored.");
      return;
    }
    refresh(nextState);
  }

  return (
    <PageShell
      title="Pets"
      subtitle="A companion-led sustainability layer with stats, rewards, accessories, and SDG badge progress."
    >
      <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
        <section className="space-y-6">
          <div className="app-card overflow-hidden">
            <div className={`bg-gradient-to-br ${petDisplay.accentClass} p-6`}>
              <div className="grid gap-5 lg:grid-cols-[0.88fr_1.12fr]">
                <div className="flex min-h-80 items-center justify-center rounded-[1.6rem] bg-white/62 p-4 backdrop-blur">
                  <div className="flex h-48 w-48 items-center justify-center rounded-[2rem] bg-white text-6xl font-semibold text-[rgb(var(--app-ink))] shadow-sm">
                    {petDisplay.avatarLabel}
                  </div>
                </div>

                <div className="space-y-4 rounded-[1.6rem] bg-white/82 p-5 backdrop-blur">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="app-chip">Active companion</div>
                      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[rgb(var(--app-ink))]">
                        {state.pet.nickname}
                      </h2>
                      <p className="mt-1 text-sm app-muted">{petDisplay.tagline}</p>
                    </div>
                    <div
                      className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide ${
                        state.pet.status === "alive"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {state.pet.status === "alive" ? "Alive and active" : "Needs revive"}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="app-stat">
                      <div className="text-xs uppercase tracking-wide app-muted">Level</div>
                      <div className="mt-1 text-2xl font-semibold text-[rgb(var(--app-ink))]">
                        {state.pet.level}
                      </div>
                    </div>
                    <div className="app-stat">
                      <div className="text-xs uppercase tracking-wide app-muted">Streak</div>
                      <div className="mt-1 text-2xl font-semibold text-[rgb(var(--app-ink))]">
                        {state.pet.streakDays}
                      </div>
                    </div>
                    <div className="app-stat">
                      <div className="text-xs uppercase tracking-wide app-muted">CG67coin</div>
                      <div className="mt-1 text-2xl font-semibold text-[rgb(var(--app-ink))]">
                        {state.coins}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] bg-[rgb(var(--app-soft))] p-4">
                    <div className="space-y-3">
                      <StatBar label="Health" value={state.pet.health} tint="bg-emerald-500" />
                      <StatBar label="Happiness" value={state.pet.happiness} tint="bg-sky-500" />
                      <StatBar label="Energy" value={state.pet.energy} tint="bg-amber-500" />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleRevive}
                      disabled={state.pet.status !== "needs-revive"}
                      className="rounded-2xl bg-[rgb(var(--app-ink))] px-4 py-3 text-sm font-semibold text-white disabled:opacity-45"
                    >
                      Revive with {state.reviveCostCoins} CG67coin
                    </button>
                    <button
                      type="button"
                      onClick={handleDemoPetDown}
                      className="rounded-2xl border border-[rgb(var(--app-line))] bg-white px-4 py-3 text-sm text-[rgb(var(--app-ink))]"
                    >
                      Demo pet death state
                    </button>
                    <button
                      type="button"
                      onClick={handleRestoreDemo}
                      className="rounded-2xl border border-[rgb(var(--app-line))] bg-white px-4 py-3 text-sm text-[rgb(var(--app-ink))]"
                    >
                      Restore demo state
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="app-card p-5">
              <div className="app-chip">Identity</div>
              <p className="mt-3 text-sm app-muted">
                One pet per account. Players can rename the same companion, but not create a second
                one.
              </p>
              <input
                className="mt-4 w-full rounded-2xl border border-[rgb(var(--app-line))] bg-white px-4 py-3 text-sm text-[rgb(var(--app-ink))]"
                value={state.pet.nickname}
                onChange={(e) => handleNicknameChange(e.target.value)}
                placeholder="Pet nickname"
              />
              <button
                type="button"
                onClick={handleNicknameSave}
                className="mt-3 rounded-2xl bg-[rgb(var(--app-brand))] px-4 py-3 text-sm font-semibold text-white"
              >
                Save nickname
              </button>
              <div className="mt-4 text-xs app-muted">
                Adopted on {new Date(state.pet.adoptedAt).toLocaleDateString()}
              </div>
            </div>

            <div className="app-card p-5">
              <div className="app-chip">Equipped accessories</div>
              <div className="mt-4 space-y-3">
                {equippedItems.length === 0 && (
                  <div className="app-card-soft p-4 text-sm app-muted">
                    Nothing equipped yet. Buy items in the shop first.
                  </div>
                )}
                {equippedItems.map((item) => (
                  <div key={item.id} className="app-card-soft p-4">
                    <div className="text-sm font-semibold text-[rgb(var(--app-ink))]">{item.name}</div>
                    <div className="mt-1 text-xs app-muted">{item.description}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="app-card p-5">
            <div className="app-chip">SDG badges</div>
            <div className="mt-4 space-y-3">
              {earnedBadges.map((badge) => (
                <div key={badge.id} className="rounded-[1.35rem] border border-emerald-100 bg-emerald-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    {badge.sdg}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-[rgb(var(--app-ink))]">
                    {badge.title}
                  </div>
                  <div className="mt-1 text-xs app-muted">{badge.description}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="app-card p-5">
            <div className="app-chip">Owned items</div>
            <div className="mt-4 space-y-3">
              {ownedItems.length === 0 && (
                <div className="app-card-soft p-4 text-sm app-muted">No accessories owned yet.</div>
              )}
              {ownedItems.map((item) => {
                const isEquipped = state.pet.equippedItemIds.includes(item.id);
                return (
                  <div key={item.id} className="app-card-soft p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-[rgb(var(--app-ink))]">
                          {item.name}
                        </div>
                        <div className="mt-1 text-xs app-muted">{item.effect}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleEquip(item.id)}
                        className="rounded-xl border border-[rgb(var(--app-line))] bg-white px-3 py-2 text-xs font-semibold text-[rgb(var(--app-ink))]"
                      >
                        {isEquipped ? "Unequip" : "Equip"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {message && (
            <div className="rounded-[1.75rem] border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
              {message}
            </div>
          )}
        </section>
      </div>
    </PageShell>
  );
}
