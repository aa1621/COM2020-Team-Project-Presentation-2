import { supabaseAdmin } from "../lib/supabaseClient.js";

export async function authenticate(req, res, next) {
    try {
        const header = req.header("Authorization") || "";
        if (!header.startsWith("Bearer ")) {
            return res.status(401).json({error: "Missing or malformed Authorization header. Expected: Bearer <token>"});
        }

        const token = header.slice(7);

        const {data, error} = await supabaseAdmin.auth.getUser(token);

        if (error || !data.user) {
            return res.status(401).json({error: "Invalid or expired token. Please log in again."});
        }

        req.user = data.user;

        const {data: profile} = await supabaseAdmin
            .from("users")
            .select("user_id, username, display_name, role, group_id, coins")
            .eq("user_id", data.user.id)
            .maybeSingle();

        req.profile = profile ?? null;

        next();
    } catch (err) {
        next(err);
    }
}

export function requireRole(...roles) {
    return (req, res, next) => {
        const userRole = req.profile?.role;
        if (!userRole || !roles.includes(userRole)) {
            return res.status(403).json({
                error: `Forbidden. Required role: ${roles.join(" or ")}`,
            });
        }
        next();
    };
}