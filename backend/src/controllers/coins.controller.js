import { supabaseAdmin } from "../lib/supabaseClient.js"

/* const DEMO_USER_ID =
    process.env.DEMO_USER_ID || "c1aae9c3-5157-4a26-a7b3-28d8905cfef0";
 
function normalizeUserId(raw) {
    if (!raw) return null;
    const uuidV4ish =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidV4ish.test(raw)) return raw;
    if (raw === "demo-flynn" || raw === "demo") return DEMO_USER_ID;
    return raw;
} */

export async function getCoinBalance(req, res, next) {
    try {
        const userId = req.user.id;
        // if (!userId) {
        //     return res.status(400).json({ error: 'Missing user id. Pass header "x-user-id"' });
        // }

        const {data: user, error} = await supabaseAdmin
            .from("users")
            .select("user_id, coins")
            .eq("user_id", userId)
            .single();

        if (error) return next(error);
        if (!user) return res.status(404).json({error: "User not found"});

        return res.status(200).json({coins: user.coins});
    } catch (err) {
        next(err);
    }
}

export async function getCoinHistory(req, res, next) {
    try {
        const userId = req.user.id;
        // if (!userId) {
        //     return res.status(400).json({ error: 'Missing user id. Pass header "x-user-id"' });
        // }

        const limit = Math.min(parseInt(req.query?.limit) || 20, 100);
        const offset = parseInt(req.query?.offset) || 0;

        const {data: transactions, error, count} = await supabaseAdmin
            .from("coin_transactions")
            .select("transaction_id, amount, balance_after, reason, reference_id, created_at", {
                count: "exact",
            })
            .eq("user_id", userId)
            .order("created_at", {ascending: false})
            .range(offset, offset + limit - 1);

        if (error) return next(error);

        return res.status(200).json({
            transactions: transactions ?? [],
            total: count ?? 0,
            limit,
            offset,
        });
    } catch (err) {
        next(err);
    }
}
