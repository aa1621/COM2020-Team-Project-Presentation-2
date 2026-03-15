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

const PET_ONBOARDING_STORAGE_KEY = "pets_onboarding_seen";

const PET_ONBOARDING_STEPS = [
  {
    eyebrow: "Welcome",
    title: "Meet your campus companion",
    body:
      "Your pet is the emotional center of the sustainability experience. As you log actions and stay active, your companion reflects that progress.",
  },
  {
    eyebrow: "How it works",
    title: "Health, happiness, and energy all matter",
    body:
      "Your pet has live wellbeing stats. Sustainable activity helps keep it strong, while long gaps and bad states can leave it needing attention or revival.",
  },
  {
    eyebrow: "Rewards",
    title: "Coins, badges, and accessories build the loop",
    body:
      "You earn CG67coin from climate-positive actions, unlock badges as you progress, and use the shop to equip items or recover your pet when needed.",
  },
] as const;

type PetEventModalKind = "warning" | "critical" | "revived";

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

function OnboardingModal({
  stepIndex,
  onNext,
  onBack,
  onClose,
}: {
  stepIndex: number;
  onNext: () => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const step = PET_ONBOARDING_STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === PET_ONBOARDING_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(20,32,24,0.58)] p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/60 bg-[linear-gradient(140deg,rgba(239,252,242,0.98),rgba(255,248,234,0.98))] shadow-[0_30px_80px_rgba(17,24,39,0.22)]">
        <div className="grid gap-0 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="flex min-h-[20rem] flex-col justify-between bg-[linear-gradient(160deg,rgba(22,163,74,0.16),rgba(251,191,36,0.16))] p-6">
            <div>
              <div className="app-chip bg-white/80">{step.eyebrow}</div>
              <div className="mt-6 flex h-40 w-40 items-center justify-center rounded-[2rem] bg-white/85 text-4xl font-semibold text-[rgb(var(--app-ink))] shadow-sm">
                {String(stepIndex + 1).padStart(2, "0")}
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              {PET_ONBOARDING_STEPS.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 flex-1 rounded-full ${
                    index === stepIndex ? "bg-emerald-500" : "bg-white/80"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col p-6 lg:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                  Pet guide
                </div>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[rgb(var(--app-ink))]">
                  {step.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-[rgb(var(--app-line))] bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--app-ink))]"
              >
                Skip
              </button>
            </div>

            <p className="mt-5 max-w-lg text-sm leading-7 app-muted">{step.body}</p>

            <div className="mt-6 grid gap-3 rounded-[1.5rem] bg-white/80 p-4">
              <div className="text-sm font-semibold text-[rgb(var(--app-ink))]">In this hub you can:</div>
              <div className="grid gap-2 text-sm app-muted">
                <div>Track your pet's wellbeing and current status.</div>
                <div>Rename your companion and manage equipped accessories.</div>
                <div>See earned SDG badges and respond if your pet needs reviving.</div>
              </div>
            </div>

            <div className="mt-auto flex items-center justify-between gap-3 pt-8">
              <button
                type="button"
                onClick={onBack}
                disabled={isFirst}
                className="rounded-2xl border border-[rgb(var(--app-line))] bg-white px-4 py-3 text-sm font-semibold text-[rgb(var(--app-ink))] disabled:opacity-40"
              >
                Back
              </button>
              <button
                type="button"
                onClick={isLast ? onClose : onNext}
                className="rounded-2xl bg-[rgb(var(--app-brand))] px-5 py-3 text-sm font-semibold text-white"
              >
                {isLast ? "Start caring for pet" : "Next"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PetEventModal({
  kind,
  title,
  body,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
}: {
  kind: PetEventModalKind;
  title: string;
  body: string;
  primaryLabel: string;
  secondaryLabel?: string;
  onPrimary: () => void;
  onSecondary?: () => void;
}) {
  const theme =
    kind === "revived"
      ? {
          shell: "bg-[rgba(16,185,129,0.18)]",
          card: "bg-[linear-gradient(145deg,rgba(236,253,245,0.98),rgba(236,252,203,0.96))]",
          badge: "bg-emerald-100 text-emerald-800",
          orb: "bg-emerald-500",
          button: "bg-emerald-600",
        }
      : kind === "critical"
        ? {
            shell: "bg-[rgba(127,29,29,0.28)]",
            card: "bg-[linear-gradient(145deg,rgba(255,241,242,0.98),rgba(255,247,237,0.96))]",
            badge: "bg-rose-100 text-rose-800",
            orb: "bg-rose-500",
            button: "bg-rose-600",
          }
        : {
            shell: "bg-[rgba(120,113,108,0.24)]",
            card: "bg-[linear-gradient(145deg,rgba(255,251,235,0.98),rgba(254,242,242,0.96))]",
            badge: "bg-amber-100 text-amber-800",
            orb: "bg-amber-500",
            button: "bg-amber-500",
          };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${theme.shell}`}>
      <div className={`w-full max-w-xl rounded-[2rem] border border-white/70 p-6 shadow-[0_28px_90px_rgba(15,23,42,0.22)] ${theme.card}`}>
        <div className="flex items-start justify-between gap-4">
          <div className={`rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${theme.badge}`}>
            {kind === "revived" ? "Recovered" : kind === "critical" ? "Needs revive" : "Warning"}
          </div>
          {onSecondary ? (
            <button
              type="button"
              onClick={onSecondary}
              className="rounded-full border border-[rgb(var(--app-line))] bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--app-ink))]"
            >
              Close
            </button>
          ) : null}
        </div>

        <div className="mt-5 flex items-center gap-4">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-[1.6rem] bg-white shadow-sm">
            <div className={`absolute h-10 w-10 rounded-full opacity-20 blur-xl ${theme.orb}`} />
            <div className={`h-6 w-6 rounded-full ${theme.orb}`} />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-[rgb(var(--app-ink))]">
              {title}
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-7 app-muted">{body}</p>
          </div>
        </div>

        <div className="mt-6 rounded-[1.4rem] bg-white/75 p-4 text-sm app-muted">
          {kind === "revived"
            ? "Your companion has stabilized and can keep earning progress with your next climate-positive actions."
            : kind === "critical"
              ? "Use coins or a revive item to bring your companion back before continuing."
              : "Logging actions and staying active will help your companion recover before it reaches a critical state."}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          {onSecondary ? (
            <button
              type="button"
              onClick={onSecondary}
              className="rounded-2xl border border-[rgb(var(--app-line))] bg-white px-4 py-3 text-sm font-semibold text-[rgb(var(--app-ink))]"
            >
              {secondaryLabel}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onPrimary}
            className={`rounded-2xl px-5 py-3 text-sm font-semibold text-white ${theme.button}`}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PetsPage() {
  const user = getDemoUser();
  const [state, setState] = useState<GamificationState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [eventModal, setEventModal] = useState<PetEventModalKind | null>(null);
  const [warningDismissed, setWarningDismissed] = useState(false);
  const [criticalDismissed, setCriticalDismissed] = useState(false);

  useEffect(() => {
    if (!user?.user_id) return;
    setState(ensureGamificationState(user.user_id));
  }, [user?.user_id]);

  useEffect(() => {
    if (!user?.user_id) return;
    const seen = localStorage.getItem(`${PET_ONBOARDING_STORAGE_KEY}:${user.user_id}`);
    if (!seen) {
      setShowOnboarding(true);
      setOnboardingStep(0);
    }
  }, [user?.user_id]);

  useEffect(() => {
    if (!state) return;

    if (state.pet.status === "needs-revive") {
      if (!criticalDismissed) {
        setEventModal("critical");
      }
      setWarningDismissed(false);
      return;
    }

    const isWarningRange = state.pet.health <= 35 || state.pet.energy <= 35;
    if (isWarningRange && !warningDismissed && eventModal !== "revived") {
      setEventModal("warning");
      return;
    }

    if (!isWarningRange && eventModal === "warning") {
      setEventModal(null);
    }
    if (criticalDismissed) {
      setCriticalDismissed(false);
    }
  }, [state, warningDismissed, criticalDismissed, eventModal]);

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

  function closeOnboarding() {
    if (currentUser?.user_id) {
      localStorage.setItem(`${PET_ONBOARDING_STORAGE_KEY}:${currentUser.user_id}`, "true");
    }
    setShowOnboarding(false);
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
    setWarningDismissed(false);
    setCriticalDismissed(false);
    setEventModal("revived");
    refresh(result.state, "Your pet is back and ready for more climate missions.");
  }

  function handleEquip(itemId: string) {
    const nextState = toggleEquipItem(currentUser.user_id, itemId);
    refresh(nextState, "Accessory loadout updated.");
  }

  function handleDemoPetDown() {
    const nextState = setPetStatus(currentUser.user_id, "needs-revive");
    setCriticalDismissed(false);
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
      setEventModal(null);
      setWarningDismissed(false);
      setCriticalDismissed(false);
      refresh(restoredState, "Demo state restored.");
      return;
    }
    refresh(nextState);
  }

  function handleDemoWarningState() {
    const nextState = {
      ...currentState,
      pet: {
        ...currentState.pet,
        status: "alive" as const,
        health: 28,
        energy: 24,
        happiness: 41,
      },
    };
    saveGamificationState(currentUser.user_id, nextState);
    setWarningDismissed(false);
    refresh(nextState, "Demo state: your pet is now in a warning condition.");
  }

  return (
    <>
      {showOnboarding ? (
        <OnboardingModal
          stepIndex={onboardingStep}
          onBack={() => setOnboardingStep((step) => Math.max(0, step - 1))}
          onNext={() =>
            setOnboardingStep((step) => Math.min(PET_ONBOARDING_STEPS.length - 1, step + 1))
          }
          onClose={closeOnboarding}
        />
      ) : null}
      {eventModal === "warning" ? (
        <PetEventModal
          kind="warning"
          title="Your companion is running low"
          body="Energy and health have dropped into the danger zone. A few more good actions can steady things before your pet needs reviving."
          primaryLabel="Check pet stats"
          secondaryLabel="Dismiss"
          onPrimary={() => setEventModal(null)}
          onSecondary={() => {
            setWarningDismissed(true);
            setEventModal(null);
          }}
        />
      ) : null}
      {eventModal === "critical" ? (
        <PetEventModal
          kind="critical"
          title="Your pet needs reviving"
          body="Your companion has run out of energy and cannot keep progressing in its current state. Revive it to restore momentum and get back on track."
          primaryLabel={`Revive with ${state?.reviveCostCoins ?? 500} CG67coin`}
          secondaryLabel="Stay on page"
          onPrimary={handleRevive}
          onSecondary={() => {
            setCriticalDismissed(true);
            setEventModal(null);
          }}
        />
      ) : null}
      {eventModal === "revived" ? (
        <PetEventModal
          kind="revived"
          title="Your companion is back"
          body="Revival was successful. Your pet has recovered enough energy and health to jump back into your sustainability streak."
          primaryLabel="Celebrate and continue"
          onPrimary={() => setEventModal(null)}
        />
      ) : null}

      <PageShell
        title="Pets"
        subtitle="A companion-led sustainability layer with stats, rewards, accessories, and SDG badge progress."
      >
        <div className="mb-6 rounded-[1.75rem] border border-emerald-100 bg-[linear-gradient(135deg,rgba(236,253,245,0.92),rgba(255,251,235,0.92))] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="app-chip bg-white/85">New here?</div>
              <div className="mt-3 text-xl font-semibold text-[rgb(var(--app-ink))]">
                Learn how the pet system works
              </div>
              <p className="mt-2 max-w-2xl text-sm app-muted">
                Open the companion guide anytime for a quick walkthrough of stats, rewards,
                badges, revival, and how this page fits into the finished experience.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setOnboardingStep(0);
                setShowOnboarding(true);
              }}
              className="rounded-2xl border border-white/70 bg-white px-4 py-3 text-sm font-semibold text-[rgb(var(--app-ink))] shadow-sm"
            >
              Open pet guide
            </button>
          </div>
        </div>

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
                      onClick={handleDemoWarningState}
                      className="rounded-2xl border border-[rgb(var(--app-line))] bg-white px-4 py-3 text-sm text-[rgb(var(--app-ink))]"
                    >
                      Demo warning state
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
    </>
  );
}
