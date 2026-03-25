import { supabaseAdmin, supabaseUser } from "../lib/supabaseClient.js";

export async function checkAndAwardBadges(userId) {
    try {

        console.log("Badge check for user:", userId);
        const {data: badges} = await supabaseAdmin
            .from("badges")
            .select("*")
            .eq("is_active", true)
            .neq("trigger_type", "manual");

        console.log("Active badges found:", badges?.length ?? 0);

        const {data: earned} = await supabaseAdmin
            .from("user_badges")
            .select("badge_id")
            .eq("user_id", userId);

        const alreadyEarned = new Set((earned ?? []).map(b => b.badge_id));

        const {data: user} = await supabaseAdmin
            .from("users")
            .select("coins")
            .eq("user_id", userId)
            .single();

        const {data: pet} = await supabaseAdmin
            .from("pets")
            .select("streak, level")
            .eq("user_id", userId)
            .maybeSingle();

        console.log("Pet stats:", pet);

        const {data: submissions} = await supabaseAdmin
            .from("submissions")
            .select("submission_id", {count: "exact"})
            .eq("user_id", userId)
            .eq("status", "approved");

        console.log("Approved submissions:", submissions?.length ?? 0);

        const {data: co2Row} = await supabaseAdmin
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
            const {error: upsertErr} = await supabaseAdmin
                .from("user_badges")
                .upsert(toAward, { onConflict: "user_id,badge_id" });
            console.log("Upsert error:", upsertErr);
        }

        return toAward;
    } catch (err) {
        console.error("Badge check failed:", err);
    }
}