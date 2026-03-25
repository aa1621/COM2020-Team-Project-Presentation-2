import {supabaseAdmin, supabaseUser } from "../lib/supabaseClient.js";
import { deductItemPurchase } from "../services/coins.service.js";

// const DEMO_USER_ID = 
//     process.env.DEMO_USER_ID || "c1aae9c3-5157-4a26-a7b3-28d8905cfef0";

// function normalizeUserId(raw) {
//     if (!raw) return null;
//     const uuidV4ish =
//         /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
//     if (uuidV4ish.test(raw)) return raw;
//     if (raw === "demo-flynn" || raw === "demo") return DEMO_USER_ID;
//     return raw;
// }

export async function listShopItems(req, res, next) {
    try {
        const category = req.query?.category || null;

        let query = supabaseAdmin
            .from("items")
            .select("item_id, name, description, image_url, category, coin_cost, rarity")
            .eq("is_active", true)
            .order("coin_cost", { ascending: true });
        
        if (category) {
            query = query.eq("category", category);
        }

        const {data: items, error} = await query;

        if (error) return next(error);

        return res.status(200).json({items: items ?? []});
    } catch (err) {
        next(err);
    }
}

export async function buyItem(req, res, next) {
    try {
        const userId = req.user.id;
        // if (!userId) {
        //     return res.status(400).json({error: 'Missing user id. Pass header "x-user-id"'});
        // }

        const {itemId} = req.params;
        if (!itemId) {
            return res.status(400).json({error: "itemId param is required"});
        }

        const {data: item, error: itemErr} = await supabaseAdmin
            .from("items")
            .select("item_id, name, coin_cost, is_active")
            .eq("item_id", itemId)
            .maybeSingle();

        if (itemErr) return next(itemErr);
        if (!item) return res.status(404).json({error: "Item not found"});
        if (!item.is_active) return res.status(410).json({error: "Item is no longer available"});

        const {data: pet, error: petErr} = await supabaseAdmin
            .from("pets")
            .select("pet_id")
            .eq("user_id", userId)
            .maybeSingle();

        if (petErr) return next(petErr);
        if (!pet) return res.status(404).json({error: "User has no pet. Create a pet first."});

        let coinResult;
        try {
            coinResult = await deductItemPurchase(userId, item.item_id, item.coin_cost);
        } catch (err) {
            if (err.status === 402) {
                return res.status(402).json({
                    error: `Not enough coins. ${item.name} costs ${item.coin_cost} coins`,
                    ...err.details,
                });
            }
            return next(err);
        }

        const {data: existingEntry} = await supabaseAdmin
            .from("pet_items")
            .select("pet_item_id, quantity")
            .eq("pet_id", pet.pet_id)
            .eq("item_id", itemId)
            .maybeSingle();

        let inventoryEntry;

        if (existingEntry) {
            const {data: updated, error: updateErr} = await supabaseAdmin
                .from("pet_items")
                .update({quantity: existingEntry.quantity + 1})
                .eq("pet_item_id", existingEntry.pet_item_id)
                .select("*")
                .single();

                if (updateErr) return next(updateErr);
                inventoryEntry = updated;
        } else {
            const {data: inserted, error: insertErr} = await supabaseAdmin
                .from("pet_items")
                .insert({
                    pet_id: pet.pet_id,
                    item_id: itemId,
                    quantity: 1,
                    equipped: false,
                })
                .select("*")
                .single();

            if (insertErr) return next(insertErr);
            inventoryEntry = inserted;
        }

        return res.status(200).json({
            message: `${item.name} purchased successfully`,
            inventory_entry: inventoryEntry,
            coins_spent: item.coin_cost,
            new_coin_balance: coinResult.new_balance,
        });
    } catch (err) {
        next(err);
    }
}
