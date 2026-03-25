import { apiFetch } from "./client";
import type { DecideSubmissionResponse, ModerationQueueResponse } from "./types";

export function getModerationQueue(
  options: { status?: string; limit?: number } = {}
) {
  const params = new URLSearchParams();
  if (options.status) params.set("status", options.status);
  if (options.limit) params.set("limit", String(options.limit));
  const suffix = params.toString() ? `?${params.toString()}` : "";

  return apiFetch<ModerationQueueResponse>(`/moderation/queue${suffix}`);
}

export function decideSubmission(
  submissionId: string,
  decision: "approve" | "reject",
  reason?: string
) {
  return apiFetch<DecideSubmissionResponse>(`/moderation/submissions/${submissionId}/decision`, {
    method: "POST",
    body: JSON.stringify({
      decision,
      reason: reason?.trim() ? reason.trim() : null,
    }),
  });
}
