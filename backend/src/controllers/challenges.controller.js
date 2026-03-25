import { supabaseAdmin, supabaseUser } from "../lib/supabaseClient.js";
import { safeParseJson } from "../services/challengeRules.service.js";
import { requireModerator } from "../services/requireModerator.service.js";

const VALID_CHALLENGE_TYPES = ["personal", "group"];

export async function listChallenges(req, res, next) {
    try {
        const type = req.query.type;

        let q = supabaseUser
            .from("challenges")
            .select("challenge_id, title, challenge_type, rules, scoring, start_date, end_date, is_active, created_by")
            .order("start_date", {ascending: false});

        if (type) {
            q = q.eq("challenge_type", type);
        }

        const {data, error} = await q;

        if (error) return next(error);

        const payload = (data ?? []).map(c => ({
            ...c,
            rules: safeParseJson(c.rules, {}),
            scoring: safeParseJson(c.scoring, {}),
        }));

        res.json({challenges: payload});
    } catch (err) {
        next(err);
    }
}

export async function getChallenge(req, res, next) {
    try {
        const {challengeId} = req.params;

        const {data, error} = await supabaseUser
            .from("challenges")
            .select("challenge_id, title, challenge_type, rules, scoring, start_date, end_date, is_active, created_by")
            .eq("challenge_id", challengeId)
            .single();

        if (error) return next(error);
        if(!data) return res.status(404).json({error: "Challenge not found"});

        res.json({
            challenge: {
                ...data,
                rules: safeParseJson(data.rules, {}),
                scoring: safeParseJson(data.scoring, {}),
            },
        });
    } catch (err) {
        next(err);
    }
}

export async function listChallengeSubmissions(req, res, next) {
    try {
        const {challengeId} = req.params;

        const limit = Math.min(Number(req.query.limit ?? 50), 200);
        const status = req.query.status;

        let q = supabaseUser
            .from("submissions")
            .select("submission_id, challenge_id, user_id, group_id, points, status")
            .eq("challenge_id", challengeId)
            .order("points", {ascending: false})
            .limit(limit);

        if (status) q = q.eq("status", status);

        const {data, error} = await q;
        if (error) return next(error);

        res.json({submissions: data ?? []});
    } catch (err) {
        next(err);
    }
}

export async function listUserSubmissions(req, res, next) {
    try {
        const {userId} = req.params;

        const limit = Math.min(Number(req.query.limit ?? 50), 200);

        const {data, error} = await supabaseUser
            .from("submissions")
            .select("submission_id, challenge_id, user_id, group_id, points, status")
            .eq("user_id", userId)
            .order("points", {ascending: false})
            .limit(limit);
        
        if (error) return next(error);

        res.json({submissions: data ?? []});
    } catch (err) {
        next(err);
    }
}

// MODERATOR ENDPOINTS

export async function createChallenge(req, res, next) {
    try {
        if (!requireModerator(req, res)) return;

        const moderatorId = req.user.id;
        // if (!moderatorId) {
        //     return res.status(400).json({error: 'Missing moderator id. Pass header "x-user-id"'});
        // }

        const title = (req.body?.title || "").trim();
        if (!title) {
            return res.status(400).json({error: "title is required"});
        }

        const challenge_type = (req.body?.challenge_type || "").trim();
        if (!challenge_type || !VALID_CHALLENGE_TYPES.includes(challenge_type)) {
            return res.status(400).json({
                error: `challenge_type is required. Valid options: ${VALID_CHALLENGE_TYPES.join(", ")}`,
            });
        }

        const start_date = req.body?.start_date ?? null;
        const end_date = req.body?.end_date ?? null;

        if (start_date && end_date && end_date < start_date) {
            return res.status(400).json({error: "end_date cannot be before start_date"});
        }

        const rulesRaw = req.body?.rules ?? {};
        const scoringRaw = req.body?.scoring ?? {points_per_kg: 10};

        let rules, scoring;
        try {
            rules = typeof rulesRaw === "string" ? rulesRaw : JSON.stringify(rulesRaw);
            scoring = typeof scoringRaw === "string" ? scoringRaw : JSON.stringify(scoringRaw);
        } catch {
            return res.status(400).json({error: "rules and scoring must be valid JSON"});
        }

        const {data: challenge, error} = await supabaseAdmin
            .from("challenges")
            .insert({
                title,
                challenge_type,
                rules,
                scoring,
                start_date,
                end_date,
                is_active: true,
                created_by: moderatorId,
            })
            .select("*")
            .single();

        if (error) return next(error);

        return res.status(201).json({
            challenge: {
                ...challenge,
                rules: safeParseJson(challenge.rules, {}),
                scoring: safeParseJson(challenge.scoring, {}),
            },
        });
    } catch (err) {
        next(err);
    }
}

export async function updateChallenge(req, res, next) {
    try {
        if (!requireModerator(req, res)) return;

        const {challengeId} = req.params;

        const {data: existing, error: fetchErr} = await supabaseAdmin
            .from("challenges")
            .select("challenge_id, is_active")
            .eq("challenge_id", challengeId)
            .maybeSingle();

        if (fetchErr) return next(fetchErr);
        if (!existing) return res.status(404).json({error: "Challenge not found"});
        if (!existing.is_active) {
            return res.status(400).json({error: "Cannot edit a deactivated challenge"});
        }

        const allowed = ["title", "challenge_type", "start_date", "end_date"];
        const updates = {};

        for (const field of allowed) {
            if (req.body?.[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        if (req.body?.rules !== undefined) {
            updates.rules = 
                typeof req.body.rules === "string"
                    ? req.body.rules
                    : JSON.stringify(req.body.rules);
        }
        if (req.body?.scoring !== undefined) {
            updates.scoring =
                typeof req.body.scoring === "string"
                    ? req.body.scoring
                    : JSON.stringify(req.body.scoring);
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                error: `No valid fields provided. Allowed : ${[...allowed, "rules", "scoring"].join(", ")}`,
            });
        }

        if (updates.challenge_type && !VALID_CHALLENGE_TYPES.includes(updates.challenge_type)) {
            return res.status(400).json({
                error: `Invalid challenge_type. Valid options: ${VALID_CHALLENGE_TYPES.join(", ")}`,
            });
        }

        const start = updates.start_date;
        const end = updates.end_date;
        if (start && end && end < start) {
            return res.status(400).json({error: "end_date cannot be before start_date"});
        }

        const {data: updated, error: updateErr} = await supabaseAdmin
            .from("challenges")
            .update(updates)
            .eq("challenge_id", challengeId)
            .select("*")
            .single();
        
        if (updateErr) return next(updateErr);

        return res.status(200).json({
            challenge: {
                ...updated,
                rules: safeParseJson(updated.rules, {}),
                scoring: safeParseJson(updated.scoring, {}),
            },
        });
    } catch (err) {
        next(err);
    }
}

export async function deactivateChallenge(req, res, next) {
    try {
        if (!requireModerator(req, res)) return;

        const {challengeId} = req.params;

        const {data: existing, error: fetchErr} = await supabaseAdmin
            .from("challenges")
            .select("challenge_id, title, is_active")
            .eq("challenge_id", challengeId)
            .maybeSingle();
        
        if (fetchErr) return next(fetchErr);
        if (!existing) return res.status(404).json({error: "Challenge not found"});
        if (!existing.is_active) {
            return res.status(400).json({error: "Challenge is already deactivated"});
        }

        const {data: updated, error: updateErr} = await supabaseAdmin
            .from("challenges")
            .update({is_active: false})
            .eq("challenge_id", challengeId)
            .select("challenge_id, title, is_active")
            .single();

        if (updateErr) return next(updateErr);

        return res.status(200).json({
            message: `Challenge "${updated.title}" has been deactivated`,
            challenge: updated,
        });
    } catch (err) {
        next(err);
    }
}