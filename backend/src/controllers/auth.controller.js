import { supabaseAdmin } from "../lib/supabaseClient.js";

export async function login(req, res, next) {
    try {
        const { username, password } = req.body || {};

        if (!username || !password) {
            return res.status(400).json({ error: "Username and password are required." });
        }

        const { data: user, error } = await supabaseAdmin
            .from("users")
            .select("user_id, username, display_name, role, group_id")
            .eq("username", username)
            .eq("password", password)
            .single();

        if (error) {
            if (error.code === "PGRST116") {
                return res.status(401).json({ error: "Invalid credentials." });
            }
            return next(error);
        }

        if (!user) {
            return res.status(401).json({ error: "Invalid credentials." });
        }

        return res.status(200).json({ user });
    } catch (err) {
        next(err);
    }
}

export async function signup(req, res, next) {
    try {
        const username = (req.body?.username || "").trim();
        const display_name = (req.body?.display_name || "").trim() || null;
        const password = req.body?.password || "";

        if (!username || !password) {
            return res.status(400).json({ error: "Username and password are required." });
        }

        if (username.length < 3) {
            return res.status(400).json({ error: "Username must be at least 3 characters long." });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters long." });
        }

        const { data: existingUser, error: existingError } = await supabaseAdmin
            .from("users")
            .select("user_id")
            .eq("username", username)
            .maybeSingle();

        if (existingError) return next(existingError);
        if (existingUser) {
            return res.status(409).json({ error: "That username is already taken." });
        }

        const { data: user, error: insertError } = await supabaseAdmin
            .from("users")
            .insert({
                username,
                display_name,
                password,
                role: "participant",
                group_id: null,
            })
            .select("user_id, username, display_name, role, group_id")
            .single();

        if (insertError) return next(insertError);

        return res.status(201).json({ user });
    } catch (err) {
        next(err);
    }
}
