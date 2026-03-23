import { apiFetch } from "./client";
import type {
  GroupLeaderboardsResponse,
  UserLeaderboardsResponse,
} from "./types";

export function getUserLeaderboards(groupId?: string) {
  // optional group filter (for "My group" tab)
  const params = new URLSearchParams();
  if (groupId) params.set("group_id", groupId);
  const suffix = params.toString() ? `?${params.toString()}` : "";

  return apiFetch<UserLeaderboardsResponse>(`/leaderboards/users${suffix}`);
}

export function getGroupLeaderboards() {
  return apiFetch<GroupLeaderboardsResponse>("/leaderboards/groups");
}
