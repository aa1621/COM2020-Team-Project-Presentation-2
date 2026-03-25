import { supabaseAdmin, supabaseUser } from "../lib/supabaseClient.js";

export async function checkAndAwardBadges(userId) {
    try {
        const {data: badges} = await supabaseUser
            .from("badges")
            .select("*")
            .eq("is_active", true)
            .neq("trigger_type", "manual");

        const {data: earned} = await supabaseUser
            .from("user_badges")
            .select("badge_id")
            .eq("user_id", userId);

        const alreadyEarned = new Set((earned ?? []).map(b => b.badge_id));

        const {data: user} = await supabaseUser
            .from("users")
            .select("coins")
            .eq("user_id", userId)
            .single();

        const {data: pet} = await supabaseUser
            .from("pets")
            .select("streak, level")
            .eq("user_id", userId)
            .maybeSingle();

        const {data: submissions} = await supabaseUser
            .from("submissions")
            .select("submission_id", {count: "exact"})
            .eq("user_id", userId)
            .eq("status", "approved");

        const {data: co2Row} = await supabaseUser
            .from("action_logs")
            .select("calculated_co2e")
            .eq("user_id", userId);

        const totalCo2 = (co2Row ?? []).reduce((sum, r) => sum + (r.calculated_co2e ?? 0), 0);

        const stats = {
            submission_count: submissions?.length ?? 0,
            streak: pet?.streak ?? 0,
            co2_total: totalCo2,
            level: pet?.level ?? 1,
        };

        const toAward = [];

        for (const badge of badges ?? []) {
            if (alreadyEarned.has(badge.badge_id)) continue;

            const value = stats[badge.trigger_type] ?? 0;
            if (value >= badge.trigger_value) {
                toAward.push({user_id: userId, badge_id: badge.badge_id});
            }
        }

        if (toAward.length > 0) {
            await supabaseAdmin
                .from("user_badges")
                .upsert(toAward, { onConflict: "user_id,badge_id" });
        }

        return toAward;
    } catch (err) {
        console.error("Badge check failed:", err);
    }
}