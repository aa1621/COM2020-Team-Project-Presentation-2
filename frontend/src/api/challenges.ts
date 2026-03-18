import { apiFetch } from "./client";
import type {
  ChallengeListResponse,
  ChallengeSubmissionsResponse,
  CreateChallengeSubmissionRequest,
  CreateChallengeSubmissionResponse,
} from "./types";

export function getChallenges(type?: "group" | "personal") {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiFetch<ChallengeListResponse>(`/challenges${suffix}`);
}

export function getChallengeSubmissions(
  challengeId: string,
  options: { limit?: number; status?: string } = {}
) {
  const params = new URLSearchParams();
  if (options.limit) params.set("limit", String(options.limit));
  if (options.status) params.set("status", options.status);
  const suffix = params.toString() ? `?${params.toString()}` : "";

  return apiFetch<ChallengeSubmissionsResponse>(
    `/challenges/${challengeId}/submissions${suffix}`
  );
}

export function createChallengeSubmission(
  challengeId: string,
  body: CreateChallengeSubmissionRequest
) {
  return apiFetch<CreateChallengeSubmissionResponse>(
    `/challenges/${challengeId}/submissions`,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
}
