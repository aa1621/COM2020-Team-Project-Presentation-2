import { supabaseAdmin, supabaseUser } from "../lib/supabaseClient.js";
 
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

export async function getEarnedBadges(req, res, next) {
    try {
        const userId = req.user.id;
        /*if (!userId) {
            return res.status(400).json({error: 'Missing user id. Pass header "x-user-id'});
        }*/

        const {data: badges, error} = await supabaseAdmin
            .from("user_badges")
            .select(`
                user_badge_id,
                earned_at,
                badges (
                    badge_id,
                    name,
                    description,
                    image_url,
                    sdg_number,
                    trigger_type
                )
            `)
            .eq("user_id", userId)
            .order("earned_at", {ascending: false});

        if (error) return next(error);

        return res.status(200).json({badges: badges ?? [] });
    } catch (err) {
        next(err);
    }
}

export async function listAllBadges(req, res, next) {
    try {
        let query = supabaseUser
            .from("badges")
            .select("badge_id, name, description, image_url, sdg_number, trigger_type, trigger_value, is_active")
            .order("sdg_number", {ascending: true});

        if (req.query?.active !== undefined) {
            const isActive = req.query.active === "true";
            query = query.eq("is_active", isActive);
        }

        const {data: badges, error} = await query;

        if (error) return next(error);

        return res.status(200).json({badges: badges ?? []});
    } catch (err) {
        next(err);
    }
}