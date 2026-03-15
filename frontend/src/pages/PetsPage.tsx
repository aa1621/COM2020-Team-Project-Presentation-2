import { useEffect, useRef, useState } from "react";
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

function clampPercentage(value: number) {
  return Math.max(0, Math.min(100, value));
}

function getPetMood(state: GamificationState) {
  if (state.pet.status === "needs-revive") {
    return {
      label: "Critical",
      summary: "Your companion has fully crashed and needs revival support.",
      chip: "bg-rose-100 text-rose-700",
    };
  }

  const average = (state.pet.health + state.pet.happiness + state.pet.energy) / 3;

  if (average >= 85) {
    return {
      label: "Thriving",
      summary: "Everything is stable and your pet is in excellent shape.",
      chip: "bg-emerald-100 text-emerald-700",
    };
  }

  if (average >= 60) {
    return {
      label: "Steady",
      summary: "Your pet is doing well, with room for a little extra momentum.",
      chip: "bg-sky-100 text-sky-700",
    };
  }

  if (average >= 35) {
    return {
      label: "Worried",
      summary: "Stats are slipping and your companion needs attention soon.",
      chip: "bg-amber-100 text-amber-700",
    };
  }

  return {
    label: "Fading",
    summary: "Your companion is close to a full collapse if nothing changes.",
    chip: "bg-rose-100 text-rose-700",
  };
}

function getCarePriority(state: GamificationState) {
  const metrics = [
    { label: "Health", value: state.pet.health },
    { label: "Happiness", value: state.pet.happiness },
    { label: "Energy", value: state.pet.energy },
  ].sort((a, b) => a.value - b.value);

  return metrics[0];
}

function getCompanionFeed(state: GamificationState, equippedCount: number, badgeCount: number) {
  return [
    {
      label: "Companion linked",
      detail: `Adopted ${new Date(state.pet.adoptedAt).toLocaleDateString()}`,
    },
    {
      label: "Current streak",
      detail: `${state.pet.streakDays} day${state.pet.streakDays === 1 ? "" : "s"} of momentum`,
    },
    {
      label: "Loadout status",
      detail:
        equippedCount > 0
          ? `${equippedCount} accessory slot${equippedCount === 1 ? "" : "s"} active`
          : "No accessories equipped yet",
    },
    {
      label: "Badge progress",
      detail:
        badgeCount > 0
          ? `${badgeCount} SDG badge${badgeCount === 1 ? "" : "s"} already earned`
          : "No badges unlocked yet",
    },
  ];
}

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
              <div className="text-sm font-semibold text-[rgb(var(--app-ink))]">
                In this hub you can:
              </div>
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
  errorMessage,
  isInvalid,
}: {
  kind: PetEventModalKind;
  title: string;
  body: string;
  primaryLabel: string;
  secondaryLabel?: string;
  onPrimary: () => void;
  onSecondary?: () => void;
  errorMessage?: string | null;
  isInvalid?: boolean;
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
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${theme.shell}`}
    >
      <style>{`
        @keyframes pet-modal-shake {
          0% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          50% { transform: translateX(8px); }
          75% { transform: translateX(-6px); }
          100% { transform: translateX(0); }
        }
      `}</style>
      <div
        className={`w-full max-w-xl rounded-[2rem] border border-white/70 p-6 shadow-[0_28px_90px_rgba(15,23,42,0.22)] ${
          isInvalid
            ? "bg-[linear-gradient(145deg,rgba(229,231,235,0.98),rgba(243,244,246,0.96))] grayscale-[0.2]"
            : theme.card
        }`}
        style={isInvalid ? { animation: "pet-modal-shake 0.35s ease-in-out" } : undefined}
      >
        <div className="flex items-start justify-between gap-4">
          <div
            className={`rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${theme.badge}`}
          >
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
        {errorMessage ? (
          <div className="mt-4 rounded-[1.2rem] bg-gray-900 px-4 py-3 text-sm text-white">
            {errorMessage}
          </div>
        ) : null}
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
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalShake, setModalShake] = useState(false);
  const wellbeingRef = useRef<HTMLDivElement | null>(null);

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
      setModalError(null);
      setWarningDismissed(false);
      return;
    }

    const isWarningRange = state.pet.health <= 35 || state.pet.energy <= 35;
    if (isWarningRange && !warningDismissed && eventModal !== "revived") {
      setEventModal("warning");
      setModalError(null);
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
  const petMood = getPetMood(currentState);
  const carePriority = getCarePriority(currentState);
  const wellbeingAverage = Math.round(
    (currentState.pet.health + currentState.pet.happiness + currentState.pet.energy) / 3
  );
  const companionFeed = getCompanionFeed(
    currentState,
    equippedItems.length,
    earnedBadges.length
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
      setModalError(result.error);
      setModalShake(true);
      window.setTimeout(() => setModalShake(false), 400);
      return;
    }
    setWarningDismissed(false);
    setCriticalDismissed(false);
    setModalError(null);
    setModalShake(false);
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
    setModalError(null);
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
      setModalError(null);
      setModalShake(false);
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
    setModalError(null);
    refresh(nextState, "Demo state: your pet is now in a warning condition.");
  }

  function handleCheckStats() {
    setEventModal(null);
    window.setTimeout(() => {
      wellbeingRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
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
          onPrimary={handleCheckStats}
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
          errorMessage={modalError}
          isInvalid={modalShake}
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

        <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.18fr)_minmax(20rem,0.82fr)]">
          <section className="space-y-6">
            <div className="relative overflow-hidden rounded-[2rem] border border-[rgb(var(--app-line))] bg-[linear-gradient(135deg,rgba(247,252,249,0.96),rgba(255,247,237,0.96))] p-6 shadow-sm">
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-200/50 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-amber-200/40 blur-3xl" />

              <div className="relative grid gap-6 2xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <div
                  className={`overflow-hidden rounded-[1.8rem] bg-gradient-to-br ${petDisplay.accentClass} p-5`}
                >
                  <div className="rounded-[1.5rem] bg-white/72 p-4 backdrop-blur">
                    <div className="flex items-center justify-between gap-3">
                      <div className="app-chip bg-white/85">Active companion</div>
                      <div
                        className={`rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-wide ${petMood.chip}`}
                      >
                        {petMood.label}
                      </div>
                    </div>

                    <div className="relative mt-6 flex min-h-[20rem] items-center justify-center rounded-[1.8rem] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.95),rgba(255,255,255,0.7))] p-6">
                      <div className="absolute inset-x-12 bottom-8 h-8 rounded-full bg-[rgba(31,41,55,0.09)] blur-2xl" />
                      <div className="relative flex h-56 w-56 items-center justify-center rounded-[2.25rem] border border-white/70 bg-white text-7xl font-semibold text-[rgb(var(--app-ink))] shadow-[0_18px_35px_rgba(15,23,42,0.12)]">
                        {petDisplay.avatarLabel}
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 lg:grid-cols-3">
                      <div className="rounded-[1.35rem] bg-white/85 p-4">
                        <div className="text-[11px] uppercase tracking-[0.18em] app-muted">
                          Level
                        </div>
                        <div className="mt-2 text-2xl font-semibold text-[rgb(var(--app-ink))]">
                          {state.pet.level}
                        </div>
                      </div>
                      <div className="rounded-[1.35rem] bg-white/85 p-4">
                        <div className="text-[11px] uppercase tracking-[0.18em] app-muted">
                          Streak
                        </div>
                        <div className="mt-2 text-2xl font-semibold text-[rgb(var(--app-ink))]">
                          {state.pet.streakDays}
                        </div>
                      </div>
                      <div className="rounded-[1.35rem] bg-white/85 p-4">
                        <div className="text-[11px] uppercase tracking-[0.18em] app-muted">
                          Coins
                        </div>
                        <div className="mt-2 text-2xl font-semibold text-[rgb(var(--app-ink))]">
                          {state.coins}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="rounded-[1.8rem] border border-white/70 bg-white/80 p-6 backdrop-blur">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                          Finished-product preview
                        </div>
                        <h2 className="mt-3 text-4xl font-semibold tracking-tight text-[rgb(var(--app-ink))]">
                          {state.pet.nickname}
                        </h2>
                        <p className="mt-2 max-w-xl text-sm leading-7 app-muted">
                          {petMood.summary} This companion view is designed to feel like the final
                          emotional layer of the product rather than a temporary data panel.
                        </p>
                      </div>
                      <div
                        className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${
                          state.pet.status === "alive"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {state.pet.status === "alive" ? "Alive and active" : "Needs revive"}
                      </div>
                    </div>

                    <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                      <div
                        ref={wellbeingRef}
                        className="rounded-[1.5rem] bg-[rgb(var(--app-soft))] p-5"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.18em] app-muted">
                              Overall wellbeing
                            </div>
                            <div className="mt-2 text-3xl font-semibold text-[rgb(var(--app-ink))]">
                              {wellbeingAverage}%
                            </div>
                          </div>
                          <div
                            className={`rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-wide ${petMood.chip}`}
                          >
                            {petMood.label}
                          </div>
                        </div>
                        <div className="mt-4 h-3 overflow-hidden rounded-full bg-white">
                          <div
                            className="h-3 rounded-full bg-[linear-gradient(90deg,#10b981,#84cc16,#f59e0b)]"
                            style={{ width: `${clampPercentage(wellbeingAverage)}%` }}
                          />
                        </div>
                        <div className="mt-4 text-sm app-muted">
                          Lowest priority right now:{" "}
                          <span className="font-semibold text-[rgb(var(--app-ink))]">
                            {carePriority.label}
                          </span>{" "}
                          at{" "}
                          <span className="font-semibold text-[rgb(var(--app-ink))]">
                            {carePriority.value}%
                          </span>
                          .
                        </div>
                      </div>

                      <div className="rounded-[1.5rem] border border-[rgb(var(--app-line))] bg-white p-5">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] app-muted">
                          Companion pulse
                        </div>
                        <div className="mt-4 grid gap-3">
                          <div className="flex items-center justify-between rounded-[1.15rem] bg-[rgb(var(--app-soft))] px-4 py-3">
                            <span className="text-sm app-muted">Primary concern</span>
                            <span className="text-sm font-semibold text-[rgb(var(--app-ink))]">
                              {carePriority.label}
                            </span>
                          </div>
                          <div className="flex items-center justify-between rounded-[1.15rem] bg-[rgb(var(--app-soft))] px-4 py-3">
                            <span className="text-sm app-muted">Adopted</span>
                            <span className="text-sm font-semibold text-[rgb(var(--app-ink))]">
                              {new Date(state.pet.adoptedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between rounded-[1.15rem] bg-[rgb(var(--app-soft))] px-4 py-3">
                            <span className="text-sm app-muted">Accessories equipped</span>
                            <span className="text-sm font-semibold text-[rgb(var(--app-ink))]">
                              {equippedItems.length}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-3 lg:grid-cols-3">
                      <div className="rounded-[1.4rem] border border-emerald-100 bg-emerald-50/85 p-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                          Health
                        </div>
                        <div className="mt-2 text-2xl font-semibold text-[rgb(var(--app-ink))]">
                          {state.pet.health}%
                        </div>
                        <div className="mt-3">
                          <StatBar
                            label="Condition"
                            value={state.pet.health}
                            tint="bg-emerald-500"
                          />
                        </div>
                      </div>
                      <div className="rounded-[1.4rem] border border-sky-100 bg-sky-50/85 p-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                          Happiness
                        </div>
                        <div className="mt-2 text-2xl font-semibold text-[rgb(var(--app-ink))]">
                          {state.pet.happiness}%
                        </div>
                        <div className="mt-3">
                          <StatBar
                            label="Mood"
                            value={state.pet.happiness}
                            tint="bg-sky-500"
                          />
                        </div>
                      </div>
                      <div className="rounded-[1.4rem] border border-amber-100 bg-amber-50/85 p-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                          Energy
                        </div>
                        <div className="mt-2 text-2xl font-semibold text-[rgb(var(--app-ink))]">
                          {state.pet.energy}%
                        </div>
                        <div className="mt-3">
                          <StatBar
                            label="Charge"
                            value={state.pet.energy}
                            tint="bg-amber-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                    <div className="rounded-[1.8rem] border border-[rgb(var(--app-line))] bg-white p-5 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="app-chip">Care controls</div>
                          <div className="mt-3 text-2xl font-semibold text-[rgb(var(--app-ink))]">
                            Keep the companion stable
                          </div>
                        </div>
                        <div
                          className={`rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-wide ${petMood.chip}`}
                        >
                          {petMood.label}
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={handleRevive}
                          disabled={state.pet.status !== "needs-revive"}
                          className="rounded-[1.35rem] bg-[rgb(var(--app-ink))] px-4 py-4 text-sm font-semibold text-white disabled:opacity-45"
                        >
                          Revive with {state.reviveCostCoins} CG67coin
                        </button>
                        <button
                          type="button"
                          onClick={handleNicknameSave}
                          className="rounded-[1.35rem] bg-[rgb(var(--app-brand))] px-4 py-4 text-sm font-semibold text-white"
                        >
                          Save companion identity
                        </button>
                        <button
                          type="button"
                          onClick={handleDemoWarningState}
                          className="rounded-[1.35rem] border border-[rgb(var(--app-line))] bg-white px-4 py-4 text-sm font-semibold text-[rgb(var(--app-ink))]"
                        >
                          Trigger warning state
                        </button>
                        <button
                          type="button"
                          onClick={handleDemoPetDown}
                          className="rounded-[1.35rem] border border-[rgb(var(--app-line))] bg-white px-4 py-4 text-sm font-semibold text-[rgb(var(--app-ink))]"
                        >
                          Trigger revive state
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleRestoreDemo}
                        className="mt-3 w-full rounded-[1.35rem] border border-dashed border-[rgb(var(--app-line))] bg-[rgb(var(--app-soft))] px-4 py-3 text-sm font-semibold text-[rgb(var(--app-ink))]"
                      >
                        Restore demo baseline
                      </button>
                    </div>

                    <div className="rounded-[1.8rem] border border-[rgb(var(--app-line))] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,252,249,0.98))] p-5 shadow-sm">
                      <div className="app-chip">Live feed</div>
                      <div className="mt-3 text-2xl font-semibold text-[rgb(var(--app-ink))]">
                        Companion timeline
                      </div>
                      <div className="mt-4 space-y-3">
                        {companionFeed.map((entry) => (
                          <div
                            key={entry.label}
                            className="rounded-[1.25rem] border border-[rgb(var(--app-line))] bg-white px-4 py-4"
                          >
                            <div className="text-sm font-semibold text-[rgb(var(--app-ink))]">
                              {entry.label}
                            </div>
                            <div className="mt-1 text-sm app-muted">{entry.detail}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <div className="rounded-[1.85rem] border border-[rgb(var(--app-line))] bg-white p-6 shadow-sm">
                <div className="app-chip">Identity studio</div>
                <div className="mt-3 text-2xl font-semibold text-[rgb(var(--app-ink))]">
                  Shape your companion profile
                </div>
                <p className="mt-3 text-sm leading-7 app-muted">
                  One pet per account for now, but this view should still feel like a proper home
                  for that companion.
                </p>
                <input
                  className="mt-5 w-full rounded-[1.35rem] border border-[rgb(var(--app-line))] bg-white px-4 py-3 text-sm text-[rgb(var(--app-ink))]"
                  value={state.pet.nickname}
                  onChange={(e) => handleNicknameChange(e.target.value)}
                  placeholder="Pet nickname"
                />
                <div className="mt-4 rounded-[1.35rem] bg-[rgb(var(--app-soft))] p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] app-muted">
                    Profile notes
                  </div>
                  <div className="mt-3 grid gap-3 text-sm app-muted">
                    <div>Name shown across dashboard, pets, and social surfaces.</div>
                    <div>
                      Current display style uses a generated avatar label until DB art arrives.
                    </div>
                    <div>Adopted on {new Date(state.pet.adoptedAt).toLocaleDateString()}.</div>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.85rem] border border-[rgb(var(--app-line))] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,250,249,0.96))] p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="app-chip">Equipped loadout</div>
                    <div className="mt-3 text-2xl font-semibold text-[rgb(var(--app-ink))]">
                      Active accessories
                    </div>
                  </div>
                  <div className="rounded-full bg-[rgb(var(--app-soft))] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--app-ink))]">
                    {equippedItems.length} active
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {equippedItems.length === 0 ? (
                    <div className="sm:col-span-2 rounded-[1.35rem] border border-dashed border-[rgb(var(--app-line))] bg-[rgb(var(--app-soft))] p-5 text-sm app-muted">
                      Nothing equipped yet. This area is ready to feel like a real loadout preview
                      once more cosmetic assets arrive.
                    </div>
                  ) : (
                    equippedItems.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-[1.35rem] border border-[rgb(var(--app-line))] bg-white p-4"
                      >
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] app-muted">
                          {item.slot}
                        </div>
                        <div className="mt-2 text-base font-semibold text-[rgb(var(--app-ink))]">
                          {item.name}
                        </div>
                        <div className="mt-2 text-sm app-muted">{item.description}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-[1.85rem] border border-[rgb(var(--app-line))] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="app-chip">Inventory</div>
                  <div className="mt-3 text-2xl font-semibold text-[rgb(var(--app-ink))]">
                    Owned items
                  </div>
                </div>
                <div className="rounded-full bg-[rgb(var(--app-soft))] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--app-ink))]">
                  {ownedItems.length} owned
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {ownedItems.length === 0 && (
                  <div className="rounded-[1.35rem] border border-dashed border-[rgb(var(--app-line))] bg-[rgb(var(--app-soft))] p-4 text-sm app-muted">
                    No accessories owned yet. The layout is ready for a richer inventory once the
                    rest of the system catches up.
                  </div>
                )}
                {ownedItems.map((item) => {
                  const isEquipped = state.pet.equippedItemIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      className="rounded-[1.35rem] border border-[rgb(var(--app-line))] bg-[rgb(var(--app-soft))] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] app-muted">
                            {item.slot}
                          </div>
                          <div className="mt-2 text-base font-semibold text-[rgb(var(--app-ink))]">
                            {item.name}
                          </div>
                          <div className="mt-1 text-sm app-muted">{item.effect}</div>
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

            <div className="rounded-[1.85rem] border border-[rgb(var(--app-line))] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="app-chip">SDG progress</div>
                  <div className="mt-3 text-2xl font-semibold text-[rgb(var(--app-ink))]">
                    Earned badges
                  </div>
                </div>
                <div className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  {earnedBadges.length} unlocked
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {earnedBadges.length === 0 ? (
                  <div className="rounded-[1.35rem] border border-dashed border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-800">
                    No badges yet. This slot is ready for future celebrations and unlock
                    animations.
                  </div>
                ) : (
                  earnedBadges.map((badge) => (
                    <div
                      key={badge.id}
                      className="rounded-[1.35rem] border border-emerald-100 bg-[linear-gradient(135deg,rgba(236,253,245,0.98),rgba(255,255,255,0.98))] p-4"
                    >
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                        {badge.sdg}
                      </div>
                      <div className="mt-2 text-base font-semibold text-[rgb(var(--app-ink))]">
                        {badge.title}
                      </div>
                      <div className="mt-2 text-sm app-muted">{badge.description}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {message && (
              <div className="rounded-[1.85rem] border border-emerald-100 bg-[linear-gradient(135deg,rgba(236,253,245,0.98),rgba(240,253,244,0.92))] p-5 text-sm text-emerald-800 shadow-sm">
                {message}
              </div>
            )}
          </section>
        </div>
      </PageShell>
    </>
  );
}
