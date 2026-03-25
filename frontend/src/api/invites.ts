import { apiFetch } from "./client";
import type {
  CreateInviteRequest,
  CreateInviteResponse,
  ListInvitesResponse,
  RespondToInviteResponse,
} from "./types";

export function getInvites() {
  return apiFetch<ListInvitesResponse>("/invites");
}

export function respondToInvite(inviteId: string, decision: "accept" | "decline") {
  return apiFetch<RespondToInviteResponse>(`/invites/${inviteId}/respond`, {
    method: "POST",
    body: JSON.stringify({ decision }),
  });
}

export function createInvite(groupId: string, payload: CreateInviteRequest) {
  return apiFetch<CreateInviteResponse>(`/groups/${groupId}/invites`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
