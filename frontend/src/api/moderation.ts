import { apiFetch } from "./client";
import type { DecideSubmissionResponse, ModerationQueueResponse } from "./types";

type ModeratorRole = "moderator" | "maintainer";

export function getModerationQueue(
  role: ModeratorRole,
  options: { status?: string; limit?: number } = {}
) {
  const params = new URLSearchParams();
  if (options.status) params.set("status", options.status);
  if (options.limit) params.set("limit", String(options.limit));
  const suffix = params.toString() ? `?${params.toString()}` : "";

  return apiFetch<ModerationQueueResponse>(`/moderation/queue${suffix}`, {
    headers: {
      "x-user-role": role,
    },
  });
}

export function decideSubmission(
  submissionId: string,
  decision: "approve" | "reject",
  role: ModeratorRole,
  reason?: string
) {
  return apiFetch<DecideSubmissionResponse>(
    `/moderation/submissions/${submissionId}/decision`,
    {
      method: "POST",
      headers: {
        "x-user-role": role,
      },
      body: JSON.stringify({
        decision,
        reason: reason?.trim() ? reason.trim() : null,
      }),
    }
  );
}
