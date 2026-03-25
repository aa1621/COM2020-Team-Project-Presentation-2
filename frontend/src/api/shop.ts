import { apiFetch } from "./client";
import type { BuyShopItemResponse, ShopItemsResponse } from "./types";

export function getShopItems(category?: string) {
  const suffix = category ? `?category=${encodeURIComponent(category)}` : "";
  return apiFetch<ShopItemsResponse>(`/shop${suffix}`);
}

export function buyShopItem(itemId: string) {
  return apiFetch<BuyShopItemResponse>(`/shop/buy/${itemId}`, {
    method: "POST",
  });
}
