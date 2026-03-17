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

const SUPABASE_STORAGE_URL = process.env.SUPABASE_URL + "/storage/v1/object/public/pet-assets";

function getPetImageUrl(pet_type) {
    return `${SUPABASE_STORAGE_URL}/pets/${pet_type}.png`;
}

const VALID_PET_TYPES = ["cat", "bird", "turtle"];
const REVIVE_COST = 50; // Need to discuss

export async function createPet(req, res, next) {
    try {
        const userId = normalizeUserId(req.header("x-user-id"));
        if (!userId) {
            return res.status(400).json({error: 'Missing user id. Pass header "x-user-id"'});
        }

        const pet_type = (req.body?.pet_type || "").trim();
        if (!pet_type || !VALID_PET_TYPES.includes(pet_type)) {
            return res.status(400).json({
                error: `pet_type is required. Valid options ${VALID_PET_TYPES.join(", ")}`,
            });
        }

        const nickname = (req.body?.nickname || "My Pet").trim();

        const {data: existing} = await supabaseUser
            .from("pets")
            .select("pet_id")
            .eq("user_id", userId)
            .maybeSingle();
        
            if (existing) {
                return res.status(409).json({error: "User already has a pet"});
            }

            const {data: pet, error} = await supabaseAdmin
                .from("pets")
                .insert({
                    user_id: userId,
                    pet_type,
                    nickname,
                    image_url: getPetImageUrl(pet_type),
                    status: "alive",
                    health: 100,
                    happiness: 100,
                    energy: 100,
                    level: 1,
                    xp: 0,
                    streak: 0,
                    last_active_date: new Date().toISOString().split("T")[0],
                    adopted_at: new Date().toISOString(),
                })
                .select("*")
                .single();

            if (error) return next(error);

            return res.status(201).json({ pet });
    } catch (err) {
        next(err);
    }
}

export async function getMyPet(req, res, next) {
    try {
        const userId = normalizeUserId(req.header("x-user-id"));
        if (!userId) {
            return res.status(400).json({ error: 'Missing user id. Pass header "x-user-id"' });
        }

        const {data: pet, error} = await supabaseUser
            .from("pets")
            .select("*")
            .eq("user_id", userId)
            .maybeSingle();

        if (error) return next(error);
        if (!pet) return res.status(404).json({error: "No pet found for this user"});

        return res.status(200).json({pet});
    } catch (err) {
        next(err);
    }
}

export async function updateNickname(req, res, next) {
    try {
        const userId = normalizeUserId(req.header("x-user-id"));
        if (!userId) {
            return res.status(400).json({ error: 'Missing user id. Pass header "x-user-id"' });
        }

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
            .select("pet_id", nickname)
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
        const userId = normalizeUserId(req.header("x-user-id"));
        if (!userId) {
            return res.status(400).json({ error: 'Missing user id. Pass header "x-user-id"' });
        }

        const {data: pet, petErr} = await supabaseUser
            .from("pets")
            .select("*")
            .eq("user_id", userId)
            .maybeSingle();

            if (petErr) return next(petErr);
            if (!pet) res.status(404).json({error: "No pet found for this user"});

            if (pet.status === "alive") {
                return res.status(400).json({error: "Pet is already alive"});
            }

            const {data: user, error: userErr} = await supabaseUser
                .from("users")
                .select("coins")
                .eq("user_id", userId)
                .single();

            if (userErr) return next(userErr);

            if (user.coins < REVIVE_COST) {
                return res.status(402).json({
                    error: `Not enough coins. Revive costs ${REVIVE_COST} coins. You have ${user.coins}`,
                });
            }

            const newBalance = user.coins - REVIVE_COST;

            const {error: coinErr} = await supabaseAdmin
                .from("users")
                .update({coins: newBalance})
                .eq("user_id", userId);

            if (coinErr) return next(coinErr);

            await supabaseAdmin.from("coin_transactions").insert({
                user_id: userId,
                amount: -REVIVE_COST,
                balance_after: newBalance,
                reason: "revive_cost",
                reference_id: pet.pet_id,
            });

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
                coins_spent: REVIVE_COST,
                new_coin_balance: newBalance,
            });
    } catch (err) {
        next(err);
    }
}

export async function updatePetStats(req, res, next) {
    try {
        const userId = normalizeUserId(req.header("x-user-id"));
        if (!userId) {
            return res.status(400).json({ error: 'Missing user id. Pass header "x-user-id"' });
        }

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

        return res.status(200).json({pet});
    } catch (err) {
        next(err);
    }
}