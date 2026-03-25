import { apiFetch } from "./client";
import type {
  GroupLeaderboardsResponse,
  UserLeaderboardsResponse,
} from "./types";

type LeaderboardQuery = {
  groupId?: string;
  start?: string;
  end?: string;
};

export function getUserLeaderboards(options: LeaderboardQuery = {}) {
  const params = new URLSearchParams();
  if (options.groupId) params.set("group_id", options.groupId);
  if (options.start) params.set("start", options.start);
  if (options.end) params.set("end", options.end);
  const suffix = params.toString() ? `?${params.toString()}` : "";

  return apiFetch<UserLeaderboardsResponse>(`/leaderboards/users${suffix}`);
}

export function getGroupLeaderboards(options: Omit<LeaderboardQuery, "groupId"> = {}) {
  const params = new URLSearchParams();
  if (options.start) params.set("start", options.start);
  if (options.end) params.set("end", options.end);
  const suffix = params.toString() ? `?${params.toString()}` : "";

  return apiFetch<GroupLeaderboardsResponse>(`/leaderboards/groups${suffix}`);
}
