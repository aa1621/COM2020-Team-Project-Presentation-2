import { apiFetch } from "./client";
import type { CoinBalanceResponse } from "./types";

export function getCoinBalance() {
  return apiFetch<CoinBalanceResponse>("/coins");
}
