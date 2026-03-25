export type ConversionFactor = {
  factor_id: string | number;
  source: string | null;
  unit_in: string;     // e.g. km
  unit_out: string;    // kg CO2e
  value: number;       // factor value
  uncertainty: number | null;
  notes: string | null;
};

export type ActionType = {
  action_type_id: string | number;
  key: string;         // this is what is sent back
  category: string;
  name: string;
  unit: string;        // e.g. km
  default_factor_id: string | number | null;
  factor: ConversionFactor | null;
};

export type CarbonCalculation = {
  estimateKgCO2e: number;
  rangeKgCO2e: { min: number; max: number };
  factor: {
    name?: string; // may or may not exist depending on service
    value: number;
    unit: string;
  };
  confidence: "Low" | "Medium" | "High";
  caveat: string;
};

export type ActionLog = {
  action_log_id?: string | number;
  user_id: string;
  action_type_id: string | number;
  quantity: number;
  action_date: string; // "YYYY-MM-DD"
  evidence_required: boolean;
  calculated_co2e: number;
  score: number;
};

export type GetActionTypesResponse = {
  actionTypes: Array<{
    action_type_id: string | number;
    key: string;
    category: string;
    name: string;
    unit: string;
    default_factor_id: string | number | null;
    factor: any | null;
  }>;
};

export type CreateActionLogRequest = {
  action_type_key: string;
  quantity: number;
  user_id?: string;
};

export type CreateActionLogResponse = {
  log: {
    user_id: string;
    action_type_id: string | number;
    quantity: number;
    action_date: string;
    evidence_required: boolean;
    calculated_co2e: number;
    score: number;
  };
  calculation: {
    estimateKgCO2e: number;
    rangeKgCO2e: { min: number; max: number };
    factor: { value: number; unit: string };
    confidence: "Low" | "Medium" | "High";
    caveat: string;
  };
  actionType: {
    key: string;
    name: string;
    category: string;
    unit: string;
  };
};

export type ActionLogListResponse = {
  logs: Array<{
    log_id: string | number;
    user_id: string;
    action_type_id: string | number;
    quantity: number;
    action_date: string;
    calculated_co2e: number;
    score: number;
  }>;
};

export type Group = {
  group_id: string;
  name: string;
  type: string | null;
  created_at: string;
  member_count?: number;
};

export type GroupsListResponse = {
  groups: Group[];
};

export type JoinGroupResponse = {
  user: {
    user_id: string;
    username: string;
    display_name: string | null;
    role: string | null;
    group_id: string | null;
  };
  group: Group | null;
};

export type InviteUser = {
  user_id: string;
  username: string;
  display_name: string | null;
};

export type GroupInvite = {
  invite_id: string;
  group_id: string;
  invited_user_id: string;
  invited_by_user_id: string;
  status: "pending" | "accepted" | "declined" | string;
  message: string | null;
  created_at: string;
  responded_at: string | null;
  groups?: Pick<Group, "group_id" | "name" | "type"> | null;
  inviter?: InviteUser | null;
};

export type ListInvitesResponse = {
  invites: GroupInvite[];
};

export type RespondToInviteResponse = {
  invite: GroupInvite;
};

export type CreateInviteRequest = {
  username?: string;
  invited_user_id?: string;
  message?: string;
};

export type CreateInviteResponse = {
  invite: GroupInvite;
  group: Pick<Group, "group_id" | "name" | "type">;
  invitedUser: InviteUser;
};

export type UserLeaderboardEntry = {
  user_id: string;
  username: string;
  display_name: string | null;
  group_id: string | null;
  group_name: string | null;
  pet_name: string | null;
  pet_image_url: string | null;
  points: number;
};

export type UserLeaderboardsResponse = {
  leaderboards: UserLeaderboardEntry[];
};

export type GroupLeaderboardEntry = {
  group_id: string;
  name: string;
  type: string | null;
  member_count: number;
  points: number;
};

export type GroupLeaderboardsResponse = {
  leaderboards: GroupLeaderboardEntry[];
};

export type ChallengeRules = {
  evidence_required?: boolean;
  [key: string]: any;
};

export type ChallengeScoring = {
  points_per_kg?: number;
  [key: string]: any;
};

export type Challenge = {
  challenge_id: string;
  title: string;
  challenge_type?: "group" | "personal" | string;
  rules: ChallengeRules;
  scoring: ChallengeScoring;
  start_date: string | null;
  end_date: string | null;
};

export type ChallengeListResponse = {
  challenges: Challenge[];
};

export type ChallengeSubmission = {
  submission_id: string;
  challenge_id: string;
  user_id: string;
  group_id: string | null;
  points: number;
  status: string;
  evidence?: SubmissionEvidence | string | null;
};

export type ChallengeSubmissionsResponse = {
  submissions: ChallengeSubmission[];
};

export type SubmissionEvidenceImage = {
  name: string;
  mime_type: string;
  data_url: string;
};

export type SubmissionEvidence = {
  text?: string;
  images?: SubmissionEvidenceImage[];
};

export type CreateChallengeSubmissionRequest = {
  total_co2e?: number;
  log_ids?: string[];
  evidence?: SubmissionEvidence | string | null;
  groupId?: string | null;
  group_id?: string | null;
  userId?: string;
  user_id?: string;
};

export type CreateChallengeSubmissionResponse = {
  submission: ChallengeSubmission;
  computed: {
    totalCO2eKg: number;
    evidenceRequired: boolean;
    scoring: ChallengeScoring;
  };
  challenge: {
    challenge_id: string;
    title: string;
  };
};

export type ModerationDecision = {
  moderation_decision_id?: string;
  submission_id: string;
  moderator_id: string;
  decision: "approve" | "reject" | string;
  reason: string | null;
  decision_timestamp?: string;
};

export type ModerationQueueResponse = {
  submissions: ChallengeSubmission[];
};

export type DecideSubmissionResponse = {
  submission: ChallengeSubmission;
  moderationDecision: ModerationDecision;
};

export type Pet = {
  pet_id: string;
  user_id: string;
  pet_type: string;
  nickname: string;
  image_url: string | null;
  status: string;
  health: number;
  happiness: number;
  energy: number;
  level: number;
  xp: number;
  streak: number;
  last_active_date: string | null;
  adopted_at: string;
};

export type GetMyPetResponse = {
  pet: Pet;
};

export type CreatePetRequest = {
  pet_type?: string;
  nickname?: string;
};

export type CreatePetResponse = {
  pet: Pet;
};

export type PetCatalogEntry = {
  pet_type: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number | null;
};

export type PetCatalogResponse = {
  pets: PetCatalogEntry[];
};

export type UpdatePetNicknameResponse = {
  pet: {
    pet_id: string;
    nickname: string;
  };
};

export type RevivePetResponse = {
  pet: Pet;
  coins_spent: number;
  new_coin_balance: number;
};

export type CoinBalanceResponse = {
  coins: number;
};

export type InventoryItem = {
  pet_item_id: string;
  quantity: number;
  equipped: boolean;
  acquired_at: string;
  items: {
    item_id: string;
    name: string;
    description: string | null;
    image_url: string | null;
    category: string;
    rarity: string | null;
  };
};

export type InventoryResponse = {
  inventory: InventoryItem[];
};

export type InventoryMutationResponse = {
  message: string;
  inventory_entry: {
    pet_item_id: string;
    quantity?: number;
    equipped: boolean;
  };
};

export type ShopItem = {
  item_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  category: string;
  coin_cost: number;
  rarity: string | null;
};

export type ShopItemsResponse = {
  items: ShopItem[];
};

export type BuyShopItemResponse = {
  message: string;
  inventory_entry: {
    pet_item_id: string;
    pet_id: string;
    item_id: string;
    quantity: number;
    equipped: boolean;
  };
  coins_spent: number;
  new_coin_balance: number;
};

export type Badge = {
  badge_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  sdg_number: number | null;
  trigger_type: string;
  trigger_value?: number | null;
  is_active?: boolean;
};

export type EarnedBadgeEntry = {
  user_badge_id: string;
  earned_at: string;
  badges: Badge;
};

export type EarnedBadgesResponse = {
  badges: EarnedBadgeEntry[];
};

export type AllBadgesResponse = {
  badges: Badge[];
};
