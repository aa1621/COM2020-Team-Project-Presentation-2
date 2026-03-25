import { supabaseAdmin } from "../lib/supabaseClient.js";
import { createClient } from "@supabase/supabase-js";

const supabaseAuth = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_PUBLISHABLE_KEY
);

export async function register(req, res, next) {
    try {
        const email = (req.body?.email || "").trim().toLowerCase();
        const password = req.body?.password || "";
        const username = (req.body?.username || "").trim();
        const display_name = (req.body?.display_name || "").trim();

        if (!email || !password || !username || !display_name) {
            return res.status(400).json({
                error: "email, password, username and display_name are all required",
            });
        }

        if (password.length < 8) {
            return res.status(400).json({error: "Password must be at least 8 characters"});
        }

        const {data: existingUser} = await supabaseAdmin
            .from("users")
            .select("user_id")
            .eq("username", username)
            .maybeSingle();

        if (existingUser) {
            return res.status(409).json({error: "Username is already taken"});
        }

        const {data: authData, error: authErr} = await supabaseAuth.auth.signUp({
            email,
            password,
        });

        if (authErr) return next(authErr);
        
        const authUser = authData.user;

        const {data: user, error: userErr} = await supabaseAdmin
            .from("users")
            .insert({
                user_id: authUser.id,
                email,
                username,
                display_name,
                role: "participant",
            })
            .select("user_id, username, display_name, role, email")
            .single();

        if (userErr) {
            await supabaseAdmin.auth.admin.deleteUser(authUser.id);
            return next(userErr);
        }

        return res.status(201).json({
            message: "Account created successfully",
            user,
            session: authData.session,
        });
    } catch (err) {
        next(err);
    }
}

export async function login(req, res, next) {
    try {
        const identifier = (req.body?.identifier || "").trim().toLowerCase();
        const password = req.body?.password || "";

        if (!identifier || !password) {
            return res.status(400).json({error: "username or email and password are required"});
        }

        let email;

        if (identifier.includes("@")) {
            email = identifier;
        } else {
            const {data: user, error: lookupErr} = await supabaseAdmin
                .from("users")
                .select("email")
                .eq("username", identifier)
                .maybeSingle();

            if (lookupErr) return next(lookupErr);
            if (!user) return res.status(401).json({error: "Invalid username or password"});

            email = user.email;
        }

        const {data, error} = await supabaseAuth.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return res.status(401).json({error: "Invalid email or password"});
        }

        const {data: user} = await supabaseAdmin
            .from("users")
            .select("user_id, username, display_name, role, email, group_id")
            .eq("user_id", data.user.id)
            .single();

        return res.status(200).json({
            user,
            session: {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                expires_at: data.session.expires_at,
            },
        });
    } catch (err) {
        next(err);
    }
}

export async function logout(req, res, next) {
    try {
        const token = req.header("Authorization").slice(7);

        const {error} = await supabaseAdmin.auth.admin.signOut(token);

        if (error) return next(error);

        return res.status(200).json({message: "Logged out successfully"});
    } catch (err) {
        next(err);
    }
}

export async function refreshToken(req, res, next) {
    try {
        const refresh_token = req.body?.refresh_token;
        if (!refresh_token) {
            return res.status(400).json({error: "refresh_token is required"});
        }

        const {data, error} = await supabaseAuth.auth.refreshSession({refresh_token});

        if (error) {
            return res.status(401).json({error: "Invalid or expired refresh token"});
        }

        return res.status(200).json({
            session: {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                expires_at: data.session.expires_at,
            },
        });
    } catch (err) {
        next(err);
    }
}

export async function changePassword(req, res, next) {
    try {
        const new_password = req.body?.new_password || "";
        if (!new_password || new_password.length < 8) {
            return res.status(400).json({error: "new_password must be at least 8 characters"});
        }

        const {error} = await supabaseAdmin.auth.admin.updateUserById(
            req.user.id,
            {password: new_password}
        );

        if (error) return next(error);

        return res.status(200).json({message: "Password updated successfully"});
    } catch (err) {
        next(err);
    }
}

export async function deleteAccount(req, res, next) {
    try {
        const userId = req.user.id;

        const {error} = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (error) return next(error);

        return res.status(200).json({message: "Account deleted successfully"});
    } catch (err) {
        next(err);
    }
}

/* export async function login(req, res, next) {
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
*/
