import { apiFetch } from "./client";
import type { GetActionTypesResponse } from "./types";

export function getActionTypes() {
  return apiFetch<GetActionTypesResponse>("/action-types");
}
