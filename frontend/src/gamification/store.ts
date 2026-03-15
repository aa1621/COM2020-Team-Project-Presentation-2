export type PetStatus = "alive" | "needs-revive";

export type ShopItem = {
  id: string;
  name: string;
  price: number;
  slot: "head" | "face" | "background" | "boost";
  description: string;
  effect: string;
};

export type SdgBadge = {
  id: string;
  title: string;
  sdg: string;
  description: string;
};

export type PetDisplay = {
  title: string;
  tagline: string;
  accentClass: string;
  avatarLabel: string;
};

export type ActionRewardResult = {
  coinsEarned: number;
  happinessGain: number;
  energyGain: number;
  state: GamificationState;
};

export type GamificationState = {
  coins: number;
  reviveCostCoins: number;
  reviveCostCashLabel: string;
  pet: {
    templateId: string;
    nickname: string;
    status: PetStatus;
    health: number;
    happiness: number;
    energy: number;
    streakDays: number;
    level: number;
    equippedItemIds: string[];
    adoptedAt: string;
  };
  inventoryItemIds: string[];
  badgeIds: string[];
};

const STORAGE_PREFIX = "gamification_profile";
const DEFAULT_REVIVE_COST_COINS = 500;
const DEFAULT_REVIVE_COST_CASH_LABEL = "PS5 in CG67coin";
const DEFAULT_PET_TITLE = "Campus Companion";

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: "moss-cap",
    name: "Moss Cap",
    price: 45,
    slot: "head",
    description: "A soft green cap for your campus companion.",
    effect: "Cosmetic upgrade",
  },
  {
    id: "eco-shades",
    name: "Eco Shades",
    price: 60,
    slot: "face",
    description: "Sunglasses for pets with leaderboard energy.",
    effect: "Cosmetic upgrade",
  },
  {
    id: "wild-meadow",
    name: "Wild Meadow",
    price: 120,
    slot: "background",
    description: "Unlock a brighter habitat background for your pet page.",
    effect: "Cosmetic upgrade",
  },
  {
    id: "revive-token",
    name: "Revive Token",
    price: 500,
    slot: "boost",
    description: "Emergency backup if your pet reaches zero energy.",
    effect: "Revives one pet",
  },
];

export const SDG_BADGES: SdgBadge[] = [
  {
    id: "sdg-7-saver",
    title: "Energy Saver",
    sdg: "SDG 7",
    description: "Awarded for low-energy and efficiency-focused actions.",
  },
  {
    id: "sdg-11-traveller",
    title: "Low-Carbon Traveller",
    sdg: "SDG 11",
    description: "Celebrate greener campus travel and shared mobility habits.",
  },
  {
    id: "sdg-12-swapper",
    title: "Reuse Champion",
    sdg: "SDG 12",
    description: "Highlights waste reduction, swaps, and reusable choices.",
  },
  {
    id: "sdg-13-guardian",
    title: "Climate Guardian",
    sdg: "SDG 13",
    description: "A high-level badge for sustained climate-positive behaviour.",
  },
];

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`;
}

export function createStarterGamificationState(templateId: string): GamificationState {
  return {
    coins: 180,
    reviveCostCoins: DEFAULT_REVIVE_COST_COINS,
    reviveCostCashLabel: DEFAULT_REVIVE_COST_CASH_LABEL,
    pet: {
      templateId: templateId || "default",
      nickname: DEFAULT_PET_TITLE,
      status: "alive",
      health: 84,
      happiness: 76,
      energy: 68,
      streakDays: 3,
      level: 1,
      equippedItemIds: [],
      adoptedAt: new Date().toISOString(),
    },
    inventoryItemIds: [],
    badgeIds: ["sdg-11-traveller"],
  };
}

export function getGamificationState(userId: string): GamificationState | null {
  const raw = localStorage.getItem(storageKey(userId));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as GamificationState;
  } catch {
    return null;
  }
}

export function saveGamificationState(userId: string, state: GamificationState) {
  localStorage.setItem(storageKey(userId), JSON.stringify(state));
}

export function ensureGamificationState(userId: string, templateId = "default") {
  const existing = getGamificationState(userId);
  if (existing) return existing;

  const created = createStarterGamificationState(templateId);
  saveGamificationState(userId, created);
  return created;
}

export function getPetDisplay(nickname: string): PetDisplay {
  const trimmed = nickname.trim();
  return {
    title: trimmed || DEFAULT_PET_TITLE,
    tagline: "Stored from your pet profile and ready for DB-backed sync.",
    accentClass: "from-emerald-200 via-lime-100 to-amber-100",
    avatarLabel: (trimmed || DEFAULT_PET_TITLE).slice(0, 2).toUpperCase(),
  };
}

export function getOwnedShopItems(state: GamificationState) {
  return SHOP_ITEMS.filter((item) => state.inventoryItemIds.includes(item.id));
}

export function getEarnedBadges(state: GamificationState) {
  return SDG_BADGES.filter((badge) => state.badgeIds.includes(badge.id));
}

export function purchaseShopItem(userId: string, itemId: string) {
  const state = getGamificationState(userId);
  const item = SHOP_ITEMS.find((entry) => entry.id === itemId);

  if (!state || !item) {
    return { ok: false as const, error: "Could not find this player or shop item." };
  }

  if (item.id !== "revive-token" && state.inventoryItemIds.includes(item.id)) {
    return { ok: false as const, error: "You already own this accessory." };
  }

  if (state.coins < item.price) {
    return { ok: false as const, error: "You do not have enough CG67coin yet." };
  }

  const nextState: GamificationState = {
    ...state,
    coins: state.coins - item.price,
    inventoryItemIds:
      item.id === "revive-token"
        ? state.inventoryItemIds
        : [...state.inventoryItemIds, item.id],
  };

  if (item.id === "revive-token" && nextState.pet.status === "needs-revive") {
    nextState.pet = {
      ...nextState.pet,
      status: "alive",
      health: 70,
      happiness: 62,
      energy: 60,
    };
  }

  saveGamificationState(userId, nextState);
  return { ok: true as const, state: nextState, item };
}

export function toggleEquipItem(userId: string, itemId: string) {
  const state = getGamificationState(userId);
  const item = SHOP_ITEMS.find((entry) => entry.id === itemId);

  if (!state || !item) {
    return null;
  }

  if (!state.inventoryItemIds.includes(itemId)) {
    return state;
  }

  const alreadyEquipped = state.pet.equippedItemIds.includes(itemId);
  const withoutSameSlot = state.pet.equippedItemIds.filter((ownedId) => {
    const ownedItem = SHOP_ITEMS.find((entry) => entry.id === ownedId);
    return ownedItem?.slot !== item.slot;
  });

  const equippedItemIds = alreadyEquipped ? withoutSameSlot : [...withoutSameSlot, itemId];

  const nextState: GamificationState = {
    ...state,
    pet: {
      ...state.pet,
      equippedItemIds,
    },
  };

  saveGamificationState(userId, nextState);
  return nextState;
}

export function revivePetWithCoins(userId: string) {
  const state = getGamificationState(userId);
  if (!state) return { ok: false as const, error: "No pet profile found." };

  if (state.pet.status !== "needs-revive") {
    return { ok: false as const, error: "Your pet does not need reviving right now." };
  }

  if (state.coins < state.reviveCostCoins) {
    return { ok: false as const, error: `Revive costs ${state.reviveCostCoins} CG67coin.` };
  }

  const nextState: GamificationState = {
    ...state,
    coins: state.coins - state.reviveCostCoins,
    pet: {
      ...state.pet,
      status: "alive",
      health: 75,
      happiness: 70,
      energy: 65,
    },
  };

  saveGamificationState(userId, nextState);
  return { ok: true as const, state: nextState };
}

export function setPetStatus(userId: string, status: PetStatus) {
  const state = getGamificationState(userId);
  if (!state) return null;

  const nextState: GamificationState = {
    ...state,
    pet: {
      ...state.pet,
      status,
      health: status === "needs-revive" ? 0 : state.pet.health,
      energy: status === "needs-revive" ? 0 : state.pet.energy,
    },
  };

  saveGamificationState(userId, nextState);
  return nextState;
}

export function applyActionLogReward(userId: string, score: number): ActionRewardResult | null {
  const state = getGamificationState(userId);
  if (!state) return null;

  const coinsEarned = Math.max(8, Math.min(40, Math.round(score / 4)));
  const happinessGain = Math.max(4, Math.min(12, Math.round(coinsEarned / 3)));
  const energyGain = Math.max(3, Math.min(10, Math.round(coinsEarned / 4)));

  const nextState: GamificationState = {
    ...state,
    coins: state.coins + coinsEarned,
    pet: {
      ...state.pet,
      happiness: Math.min(100, state.pet.happiness + happinessGain),
      energy: Math.min(100, state.pet.energy + energyGain),
      health: Math.min(100, state.pet.health + Math.max(1, Math.round(happinessGain / 3))),
    },
  };

  saveGamificationState(userId, nextState);

  return {
    coinsEarned,
    happinessGain,
    energyGain,
    state: nextState,
  };
}
