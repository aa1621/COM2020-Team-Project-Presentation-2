import { apiFetch } from "./client";
import type {
  ActionLogListResponse,
  CreateActionLogRequest,
  CreateActionLogResponse,
} from "./types";

export function createActionLog(body: CreateActionLogRequest) {
  return apiFetch<CreateActionLogResponse>("/action-logs", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getActionLogs(start?: string, end?: string) {
  const params = new URLSearchParams();
  if (start) params.set("start", start);
  if (end) params.set("end", end);
  const suffix = params.toString() ? `?${params.toString()}` : "";

  return apiFetch<ActionLogListResponse>(`/action-logs${suffix}`);
}
