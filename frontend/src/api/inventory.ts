import { apiFetch } from "./client";
import type { InventoryMutationResponse, InventoryResponse } from "./types";

export function getInventory() {
  return apiFetch<InventoryResponse>("/inventory");
}

export function equipInventoryItem(itemId: string) {
  return apiFetch<InventoryMutationResponse>(`/inventory/${itemId}/equip`, {
    method: "PATCH",
  });
}

export function unequipInventoryItem(itemId: string) {
  return apiFetch<InventoryMutationResponse>(`/inventory/${itemId}/unequip`, {
    method: "PATCH",
  });
}
