import { supabaseUser } from "../lib/supabaseClient.js";
import { checkAndAwardBadges } from "../services/badges.service.js";
import { safeParseJson } from "../services/challengeRules.service.js";
import { calculatePoints } from "../services/scoring.service.js";

const DEMO_USER_ID =
    process.env.DEMO_USER_ID || "c1aae9c3-5157-4a26-a7b3-28d8905cfef0";

function normalizeUserId(raw) {
    if (!raw) return null;
    const uuidV4ish =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidV4ish.test(raw)) return raw;
    if (raw === "demo-flynn" || raw === "demo") return DEMO_USER_ID;
    return raw;
}

export async function createSubmission(req, res, next) {
    try {
        const { challengeId } = req.params;

        const bodyUserId = req.body?.userId;
        const demoUserId = normalizeUserId(req.header("x-user-id") || bodyUserId);
        if (!demoUserId) {
            return res.status(400).json({
                error: 'Missing user id. For now pass header "x-user-id" (or body user_id).',
            });
        }

        const groupId = req.body?.group_id ?? null;

        const evidence = req.body?.evidence ?? null;

        const totalCO2eFromBody = req.body?.total_co2e;
        const logIds = Array.isArray(req.body?.log_ids) ? req.body.log_ids : null;

        if ((totalCO2eFromBody == null || Number.isNaN(Number(totalCO2eFromBody))) && ! logIds) {
            return res.status(400).json({
                error: "Provide either total_co2e (number) or log_ids (array of uuids).",
            });
        }
        
        const { data: challenge, error: chError} = await supabaseUser
            .from("challenges")
            .select("challenge_id, title, challenge_type, rules, scoring, start_date, end_date")
            .eq("challenge_id", challengeId)
            .single();

        if (chError) return next(chError);
        if (!challenge) return res.status(404).json({error: "Challenge not found"});

        const challengeType = challenge.challenge_type;

        if (challengeType === "group") {
            if (!groupId) {
                return res.status(400).json({error: "groupId is required for group challenges"});
            }
        } else {
            if (groupId) {
                return res.status(400).json({
                    error: `groupId is not allowed for ${challengeType} challenges`,
                });
            }
        }

        const today = new Date().toISOString().slice(0, 10);
        if (challenge.start_date && today < challenge.start_date) {
            return res.status(400).json({error: "Challenge has not started yet"});
        }
        if (challenge.end_date && today > challenge.end_date) {
            return res.status(400).json({error: "Challenge has ended"});
        }

        const rulesObj = safeParseJson(challenge.rules, {});
        const scoringObj = safeParseJson(challenge.scoring, {points_per_kg: 10});

        const evidenceRequired = rulesObj?.evidence_required === true;

        if (evidenceRequired && !evidence) {
            return res.status(400).json({
                error: "Evidence is required for this challenge. Please submit evidence."
            });
        }

        let totalCO2eKg = 0;

        if (logIds) {
            const {data: logs, error: logsErr} = await supabaseUser
                .from("action_logs")
                .select("log_id, user_id, calculated_co2e")
                .in("log_id", logIds);
            
            if (logsErr) return next(logsErr);

            const foreign = (logs ?? []).find(l => l.user_id !== demoUserId);
            if (foreign) {
                return res.status(403).json({error: "One or more logs do not belong to this user"});
            }

            totalCO2eKg = (logs ?? []).reduce((sum, l) => sum + Number(l.calculated_co2e || 0), 0);
        } else {
            totalCO2eKg = Number(totalCO2eFromBody);
        }

        if (!(totalCO2eKg > 0)) {
            return res.status(400).json({error: "total_co2e must be a positive number"});
        }

        const flags = [];

        const MAX_CO2E_KG_PER_SUBMISSION = 200;
        const WINDOW_SECONDS = 120;
        const MAX_SUBMISSIONS_IN_WINDOW = 3;

        const since = new Date(Date.now() - WINDOW_SECONDS * 1000).toISOString();

        const {data: recent, error: recentErr} = await supabaseUser
            .from("submissions")
            .select("submission_id")
            .eq("user_id", demoUserId)
            .gte("created_at", since);

        if (recentErr) return next(recentErr);

        if ((recent ?? []).length >= MAX_SUBMISSIONS_IN_WINDOW) {
            flags.push({
                flag_type: "rate_limit_submission",
                rule_triggered: `>=${MAX_SUBMISSIONS_IN_WINDOW} submissions within ${WINDOW_SECONDS}s`,
            });
        }
        if (totalCO2eKg > MAX_CO2E_KG_PER_SUBMISSION) {
            flags.push({
                flag_type: "impossible_value",
                rule_triggered: `totalCO2eKg (${totalCO2eKg}) exceeds max (${MAX_CO2E_KG_PER_SUBMISSION})`,
            });
        }



        const points = calculatePoints(totalCO2eKg, scoringObj);
        let status = evidenceRequired ? "pending_review" : "approved";
        if (flags.length > 0) status = "pending_review";

        const insertRow = {
            challenge_id: challenge.challenge_id,
            user_id: demoUserId,
            group_id: groupId,
            points,
            status,
            evidence,
        };

        const {data: inserted, error: insErr} = await supabaseUser
            .from("submissions")
            .insert(insertRow)
            .select("*")
            .single();

        if (insErr) return next(insErr);

        if (flags.length > 0) {
            const rows = flags.map(f => ({
                submission_id: inserted.submission_id,
                flag_type: f.flag_type,
                rule_triggered: f.rule_triggered,
                status: "open",
            }));

            const {error: flagErr} = await supabaseUser
                .from("anti_gaming_flags")
                .insert(rows);

            if (flagErr) return next(flagErr);
        }

        if (status === "approved") await checkAndAwardBadges(demoUserId);

        return res.status(201).json({
            submission: inserted,
            computed: {
                totalCO2eKg,
                evidenceRequired,
                scoring: scoringObj,
            },
            challenge: {
                challenge_id: challenge.challenge_id,
                title: challenge.title,
            },
            antiGaming: {
                flagged: flags.length > 0, flags
            },
        });
    } catch (err) {
        next(err);
    }
}
