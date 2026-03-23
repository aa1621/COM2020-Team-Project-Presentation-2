import { supabaseAdmin, supabaseUser } from "../lib/supabaseClient.js";
 
// Can adjust
const GRACE_PERIOD_DAYS   = 1;   // days of inactivity before decline starts
const HEALTH_DECLINE_PER_DAY    = 10;  // health lost per inactive day
const HAPPINESS_DECLINE_PER_DAY = 10;  // happiness lost per inactive day
const ENERGY_DECLINE_PER_DAY    = 15;  // energy lost faster than health/happiness
 
 
export async function applyPetDecline(pet) {
    if (pet.status === "needs_revive") return pet;
 
    if (!pet.last_active_date) return pet;
 
    const today     = new Date().toISOString().split("T")[0];
    const lastActive = new Date(pet.last_active_date);
    const todayDate  = new Date(today);
 
    const msPerDay      = 1000 * 60 * 60 * 24;
    const daysSinceActive = Math.floor((todayDate - lastActive) / msPerDay);
 
    if (daysSinceActive <= GRACE_PERIOD_DAYS) return pet;
 
    const declineDays = daysSinceActive - GRACE_PERIOD_DAYS;
 
    const newHealth    = Math.max(0, pet.health    - declineDays * HEALTH_DECLINE_PER_DAY);
    const newHappiness = Math.max(0, pet.happiness - declineDays * HAPPINESS_DECLINE_PER_DAY);
    const newEnergy    = Math.max(0, pet.energy    - declineDays * ENERGY_DECLINE_PER_DAY);
 
    const newStatus = newHealth === 0 ? "needs_revive" : "alive";
 
    const healthChanged    = newHealth    !== pet.health;
    const happinessChanged = newHappiness !== pet.happiness;
    const energyChanged    = newEnergy    !== pet.energy;
    const statusChanged    = newStatus    !== pet.status;
 
    if (!healthChanged && !happinessChanged && !energyChanged && !statusChanged) {
        return pet;
    }
 
    const updates = {
        health:    newHealth,
        happiness: newHappiness,
        energy:    newEnergy,
        status:    newStatus,
    };
 
    const { data: updatedPet, error } = await supabaseAdmin
        .from("pets")
        .update(updates)
        .eq("pet_id", pet.pet_id)
        .select("*")
        .single();
 
    if (error) {
        console.error("Pet decline update failed:", error);
        return pet;
    }
 
    return updatedPet;
}
 
// HELPER: For debugging 
export function getDeclineSummary(pet) {
    if (!pet.last_active_date) return { daysSinceActive: 0, declineDays: 0 };
 
    const today       = new Date().toISOString().split("T")[0];
    const lastActive  = new Date(pet.last_active_date);
    const todayDate   = new Date(today);
    const msPerDay    = 1000 * 60 * 60 * 24;
    const daysSinceActive = Math.floor((todayDate - lastActive) / msPerDay);
    const declineDays = Math.max(0, daysSinceActive - GRACE_PERIOD_DAYS);
 
    return {
        daysSinceActive,
        declineDays,
        projectedHealth:    Math.max(0, pet.health    - declineDays * HEALTH_DECLINE_PER_DAY),
        projectedHappiness: Math.max(0, pet.happiness - declineDays * HAPPINESS_DECLINE_PER_DAY),
        projectedEnergy:    Math.max(0, pet.energy    - declineDays * ENERGY_DECLINE_PER_DAY),
    };
}