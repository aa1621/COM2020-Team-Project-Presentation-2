import { supabaseAdmin, supabaseUser } from "../lib/supabaseClient.js";

// Reward amounts right now. Can easily be changed
export const COIN_REWARDS = {
    submission_approved: 20,
    first_log_of_day: 5,
    streak_7: 25,
    streak_30: 100,
    revive_cost: -50,
    item_purchase: null,
};

async function applyCoins(userId, amount, reason, referenceId = null) {
    const {data: user, error: fetchErr} = await supabaseAdmin
        .from("users")
        .select("coins")
        .eq("user_id", userId)
        .single();
    
    if (fetchErr) throw fetchErr;
    if (!user) throw new Error(`User ${userId} not found when applying coins`);

    const newBalance = user.coins + amount;

    if (newBalance < 0) {
        const err = new Error("Insufficient coins");
        err.status = 402;
        err.details = {
            current_balance: user.coins,
            required: Math.abs(amount),
        };
        throw err;
    }

    const {error: updateErr} = await supabaseAdmin
        .from("users")
        .update({coins: newBalance})
        .eq("user_id", userId);

    if (updateErr) throw updateErr;

    const {error: logErr} = await supabaseAdmin
        .from("coin_transactions")
        .insert({
            user_id: userId,
            amount,
            balance_after: newBalance,
            reason,
            reference_id: referenceId ?? null,
        });

    if (logErr) throw logErr;

    return {new_balance: newBalance, amount, reason};
}

export async function awardSubmissionApproved(userId, submissionId) {
    return applyCoins(
        userId,
        COIN_REWARDS.submission_approved,
        "submissions_approved",
        submissionId
    );
}

export async function awardFirstLogOfDay(userId, logId) {
    const today = new Date().toISOString().slice(0, 10);

    const {data: logs, error} = await supabaseUser
        .from("action_logs")
        .select("log_id")
        .eq("user_id", userId)
        .eq("action_date", today);

    if (error) throw error;

    if ((logs ?? []).length !== 1) return null;

    return applyCoins(
        userId,
        COIN_REWARDS.first_log_of_day,
        "first_log_of_day",
        logId
    );
}

export async function awardStreakMilestone(userId, newStreak) {
    const milestones = {
        7: {reason: "streak_7", amount: COIN_REWARDS.streak_7},
        30: {reason: "streak_30", amount: COIN_REWARDS.streak_30},
    };

    const milestone = milestones[newStreak];
    if (!milestone) return null;

    return applyCoins(userId, milestone.amount, milestone.reason);
}

export async function deductReviveCost(userId, petId) {
    return applyCoins(
        userId,
        COIN_REWARDS.revive_cost,
        "revive_cost",
        petId
    );
}

export async function deductItemPurchase(userId, itemId, coinCost) {
    return applyCoins(
        userId,
        -coinCost,
        "item_purchase",
        itemId
    );
}