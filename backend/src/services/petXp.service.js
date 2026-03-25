import { supabaseAdmin } from "../lib/supabaseClient.js";
 
// XP CONFIG
const XP_PER_KG_CO2E = 10;         // XP awarded per kg of CO2e saved
const BASE_LEVEL_THRESHOLD = 100;  // XP needed to reach level 2
// Level N requires N * BASE_LEVEL_THRESHOLD XP to level up
// e.g. level 1 to 2 = 100 XP, level 2 to 3 = 200 XP, level 3 to 4 = 300 XP
 
export function xpToNextLevel(currentLevel) {
    return currentLevel * BASE_LEVEL_THRESHOLD;
}
 
export async function awardXP(userId, co2eKg) {
    const xpGained = Math.round(co2eKg * XP_PER_KG_CO2E);
    if (xpGained <= 0) return null;
 
    const { data: pet, error: fetchErr } = await supabaseAdmin
        .from("pets")
        .select("pet_id, xp, level, status")
        .eq("user_id", userId)
        .maybeSingle();
 
    if (fetchErr) throw fetchErr;
    if (!pet) return null;
    if (pet.status === "needs_revive") return null; // dead pets don't gain XP
 
    let newXp = pet.xp + xpGained;
    let newLevel = pet.level;
 
    while (newXp >= xpToNextLevel(newLevel)) {
        newXp -= xpToNextLevel(newLevel);
        newLevel += 1;
    }
 
    const { data: updatedPet, error: updateErr } = await supabaseAdmin
        .from("pets")
        .update({ xp: newXp, level: newLevel })
        .eq("pet_id", pet.pet_id)
        .select("*")
        .single();
 
    if (updateErr) throw updateErr;
 
    return {
        pet: updatedPet,
        xp_gained: xpGained,
        levelled_up: newLevel > pet.level,
        new_level: newLevel,
    };
}
