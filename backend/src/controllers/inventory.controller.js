import {supabaseAdmin, supabaseUser } from "../lib/supabaseClient.js";

const DEMO_USER_ID = 
    process.env.DEMO_USER_ID || "c1aae9c3-5157-4a26-a7b3-28d8905cfef0";

function normalizeUserId(raw) {
    if (!raw) return null;
    const uuidV4ish =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidV4ish.test(raw)) return raw;
    if (raw === "demo-flynn" || raw === "demo") return DEMO_USER_ID;
    return raw;
}

export async function getInventory(req, res, next) {
    try {
        const userId = normalizeUserId(req.header("x-user-id"));
        if (!userId) {
            return res.status(400).json({error: 'Missing user id. Pass header "x-user-id"'});
        }

        const {data: pet, error: petErr} = await supabaseUser
            .from("pets")
            .select("pet_id")
            .eq("user_id", userId)
            .maybeSingle();

        if (petErr) return next(petErr);
        if (!pet) return res.status(404).json({error: "No pet found for this user"});

        const {data: inventory, error} = await supabaseUser
            .from("pet_items")
            .select(`
                pet_item_id,
                quantity,
                equipped,
                acquired_at,
                items (
                    item_id,
                    name,
                    description,
                    image_url,
                    category,
                    rarity
                )
            `)
            .eq("pet_id", pet.pet_id)
            .order("acquired_at", { ascending: false });

        if (error) return next(error);

        return res.status(200).json({inventory: inventory ?? []});
    } catch (err) {
        next(err);
    }
}

export async function equipItem(req, res, next) {
    try {
        const userId = normalizeUserId(req.header("x-user-id"));
        if (!userId) {
            return res.status(400).json({error: 'Missing user id. Pass header "x-user-id"'});
        }

        const { itemId } = req.params;
        const {data: pet, error: petErr} = await supabaseUser
            .from("pets")
            .select("pet_id")
            .eq("user_id", userId)
            .maybeSingle();

        if (petErr) return next(petErr);
        if (!pet) return res.status(404).json({error: "No pet found for this user"});

        const {data: entry, error: entryErr} = await supabaseUser
            .from("pet_items")
            .select("pet_item_id, equipped, items(item_id, category)")
            .eq("pet_id", pet.pet_id)
            .eq("item_id", itemId)
            .maybeSingle();

        if (entryErr) return next(entryErr);
        if (!entry) return res.status(404).json({error: "Item not in this pet's inventory"});
        if (entry.equipped) return res.status(400).json({error: "Item is already equipped"});

        const category = entry.items?.category;
        if (category) {
            const {data: categoryItems, error: catErr} = await supabaseUser
                .from("items")
                .select("item_id")
                .eq("category", category);

            if (catErr) return next(catErr);

            const categoryItemIds = (categoryItems ?? []).map(i => i.item_id);

            if (categoryItemIds.length > 0) {
                await supabaseAdmin
                    .from("pet_items")
                    .update({equipped: false})
                    .eq("pet_id", pet.pet_id)
                    .eq("equipped", true)
                    .in("item_id", categoryItemIds);
            }
        }

        const {data: updated, error: equipErr} = await supabaseAdmin
            .from("pet_items")
            .update({equipped: true})
            .eq("pet_item_id", entry.pet_item_id)
            .select("*")
            .single();

        if (equipErr) return next(equipErr);

        return res.status(200).json({message: "Item equipped", inventory_entry: updated});
    } catch (err) {
        next(err);
    }
}

export async function unequipItem(req, res, next) {
    try {
        const userId = normalizeUserId(req.header("x-user-id"));
        if (!userId) {
            return res.status(400).json({error: 'Missing user id. Pass header "x-user-id"'});
        }

        const {itemId} = req.params;

        const {data: pet, error: petErr} = await supabaseUser
            .from("pets")
            .select("pet_id")
            .eq("user_id", userId)
            .maybeSingle();

        if (petErr) return next(petErr);
        if (!pet) return res.status(404).json({error: "No pet found for this user"});

        const {data: entry, error: entryErr} = await supabaseUser
            .from("pet_items")
            .select("pet_item_id, equipped")
            .eq("pet_id", pet.pet_id)
            .eq("item_id", itemId)
            .maybeSingle();

        if (entryErr) return next(entryErr);
        if(!entry) return res.status(404).json({ error: "Item not in this pet's inventory"});
        if (!entry.equipped) return res.status(400).json({error: "Item is not currently equipped"});

        const {data: updated, error: unequippErr} = await supabaseAdmin
            .from("pet_items")
            .update({equipped: false})
            .eq("pet_item_id", entry.pet_item_id)
            .select("*")
            .single();

        if (unequippErr) return next(unequippErr);

        return res.status(200).json({message: "Item unequipped", inventory_entry: updated});
    } catch (err) {
        next(err);
    }
}