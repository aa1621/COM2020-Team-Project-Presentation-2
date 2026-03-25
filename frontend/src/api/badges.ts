import { apiFetch } from "./client";
import type { AllBadgesResponse, EarnedBadgesResponse } from "./types";

export function getEarnedBadges() {
  return apiFetch<EarnedBadgesResponse>("/badges");
}

export function getAllBadges(active?: boolean) {
  const params = new URLSearchParams();
  if (active !== undefined) params.set("active", String(active));
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiFetch<AllBadgesResponse>(`/badges/all${suffix}`);
}
