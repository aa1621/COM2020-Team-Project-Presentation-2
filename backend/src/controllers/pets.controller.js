import {supabaseAdmin, supabaseUser } from "../lib/supabaseClient.js";
import { checkAndAwardBadges } from "../services/badges.service.js";
import { deductReviveCost, COIN_REWARDS } from "../services/coins.service.js";
import { applyPetDecline } from "../services/petDecline.service.js";

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

async function getCatalogPet({ petCatalogId, petType }) {
    let query = supabaseUser
        .from("pet_catalog")
        .select("pet_type, name, description, image_url, is_active, sort_order")
        .eq("pet_type", petType);

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data;
}

async function insertPetWithCatalog(userId, catalogPet, nickname) {
    const payload = {
        user_id: userId,
        pet_type: catalogPet.pet_type,
        nickname,
        image_url: catalogPet.image_url,
        status: "alive",
        health: 100,
        happiness: 100,
        energy: 100,
        level: 1,
        xp: 0,
        streak: 0,
        last_active_date: new Date().toISOString().split("T")[0],
        adopted_at: new Date().toISOString(),
    };

    const { data: pet, error } = await supabaseAdmin
        .from("pets")
        .insert(payload)
        .select("*")
        .single();

    if (!error) return { pet, error: null };

    return { pet: null, error };
}

export async function listPetCatalog(req, res, next) {
    try {
        const { data: pets, error } = await supabaseUser
            .from("pet_catalog")
            .select("pet_type, name, description, image_url, is_active, sort_order")
            .eq("is_active", true)
            .order("sort_order", { ascending: true });

        if (error) return next(error);

        return res.status(200).json({ pets: pets ?? [] });
    } catch (err) {
        next(err);
    }
}

export async function createPet(req, res, next) {
    try {
        const userId = req.user.id;
        // if (!userId) {
        //     return res.status(400).json({error: 'Missing user id. Pass header "x-user-id"'});
        // }

        const petType = (req.body?.pet_type || "").trim() || null;
        if (!petType) {
            return res.status(400).json({ error: '"pet_type" is required' });
        }

        const nickname = (req.body?.nickname || "My Pet").trim();

        const {data: existing} = await supabaseAdmin
            .from("pets")
            .select("pet_id")
            .eq("user_id", userId)
            .maybeSingle();
        
            if (existing) {
                return res.status(409).json({error: "User already has a pet"});
            }

            const catalogPet = await getCatalogPet({ petType });
            if (!catalogPet) {
                return res.status(404).json({ error: "Selected pet was not found in the catalog" });
            }
            if (catalogPet.is_active === false) {
                return res.status(410).json({ error: "Selected pet is not currently available" });
            }

            const { pet, error } = await insertPetWithCatalog(userId, catalogPet, nickname);
            if (error) return next(error);

            return res.status(201).json({ pet });
    } catch (err) {
        next(err);
    }
}

export async function getMyPet(req, res, next) {
    try {
        const userId = req.user.id;
        // if (!userId) {
        //     return res.status(400).json({ error: 'Missing user id. Pass header "x-user-id"' });
        // }

        const {data: pet, error} = await supabaseAdmin
            .from("pets")
            .select("*")
            .eq("user_id", userId)
            .maybeSingle();

        if (error) return next(error);
        if (!pet) return res.status(404).json({error: "No pet found for this user"});

        const updatedPet = await applyPetDecline(pet);

        return res.status(200).json({pet: updatedPet});
    } catch (err) {
        next(err);
    }
}

export async function updateNickname(req, res, next) {
    try {
        const userId = req.user.id;
        // if (!userId) {
        //     return res.status(400).json({ error: 'Missing user id. Pass header "x-user-id"' });
        // }

        const nickname = (req.body?.nickname || "").trim();
        if (!nickname) {
            return res.status(400).json({error: 'nickname is required'});
        }
        if (nickname.length > 100) {
            return res.status(400).json({error: "nickname is too long"});
        }

        const {data: pet, error} = await supabaseAdmin
            .from("pets")
            .update({nickname})
            .eq("user_id", userId)
            .select("pet_id, nickname")
            .maybeSingle();

        if (error) return next(error);
        if (!pet) return res.status(404).json({error: "No pet found for this user"});

        return res.status(200).json({pet});
    } catch (err) {
        next(err);
    }
}

export async function revivePet(req, res, next) {
    try {
        const userId = req.user.id;
        // if (!userId) {
        //     return res.status(400).json({ error: 'Missing user id. Pass header "x-user-id"' });
        // }

        const {data: pet, petErr} = await supabaseAdmin
            .from("pets")
            .select("*")
            .eq("user_id", userId)
            .maybeSingle();

            if (petErr) return next(petErr);
            if (!pet) return res.status(404).json({error: "No pet found for this user"});

            if (pet.status === "alive") {
                return res.status(400).json({error: "Pet is already alive"});
            }

            let coinResult;
            try {
                coinResult = await deductReviveCost(userId, pet.pet_id);
            } catch (err) {
                if (err.status === 402) {
                    return res.status(402).json({
                        error: `Not enough coins. Revive costs ${Math.abs(COIN_REWARDS.revive_cost)} coins.`,
                        ...err.details,
                    });
                }
                return next(err);
            }

            const {data: updatedPet, error: reviveErr} = await supabaseAdmin
                .from("pets")
                .update({
                    status: "alive",
                    health: 50,
                    happiness: 50,
                    energy: 50,
                    streak: 0,
                    last_active_date: new Date().toISOString().split("T")[0],
                })
                .eq("pet_id", pet.pet_id)
                .select("*")
                .single();

            if (reviveErr) return next(reviveErr);

            return res.status(200).json({
                pet: updatedPet,
                coins_spent: Math.abs(COIN_REWARDS.revive_cost),
                new_coin_balance: coinResult.new_balance,
            });
    } catch (err) {
        next(err);
    }
}

export async function updatePetStats(req, res, next) {
    try {
        const userId = req.user.id;
        // if (!userId) {
        //     return res.status(400).json({ error: 'Missing user id. Pass header "x-user-id"' });
        // }

        const allowed = ["health", "happiness", "energy", "xp", "level", "streak", "status", "last_active_date", "last_fed_at"];
        const updates = {};

        for (const field of allowed) {
            if (req.body?.[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({error: `No valid fields provided. Allowed: ${allowed.join(", ")}`});
        }

        const {data: pet, error} = await supabaseAdmin
            .from("pets")
            .update(updates)
            .eq("user_id", userId)
            .select("*")
            .maybeSingle();

        if (error) return next(error);
        if (!pet) return res.status(404).json({error: "No pet found for this user"});

        if (updates.xp !== undefined || updates.level !== undefined || updates.streak !== undefined) await checkAndAwardBadges(userId);

        return res.status(200).json({pet});
    } catch (err) {
        next(err);
    }
}
