import { apiFetch } from "./client";
import type { GroupsListResponse, JoinGroupResponse } from "./types";

export function getGroups() {
  return apiFetch<GroupsListResponse>("/groups");
}

export function joinGroup(group_id: string | null) {
  return apiFetch<JoinGroupResponse>("/groups/join", {
    method: "POST",
    body: JSON.stringify({ group_id }),
  });
}
