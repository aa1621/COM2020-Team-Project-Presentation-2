import { supabaseAdmin, supabaseUser } from '../lib/supabaseClient.js';
import { checkAndAwardBadges } from '../services/badges.service.js';
import { calculateCarbonFromFactor } from '../services/carbon.service.js';

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

export async function createActionLog(req, res, next) {
    try {
        const {action_type_key, quantity, user_id} = req.body;

        const demoUserId = normalizeUserId(req.header("x-user-id") || user_id);
        if (!demoUserId) {
            return res.status(400).json({
                error: 'Missing user id. For now pass header "x-user-id" (or body user_id)',
            });
        }

        if (!action_type_key) {
            return res.status(400).json({error: "Missing action_type_key"});
        }

        const {data: actionType, error: atErr} = await supabaseUser
            .from("action_types")
            .select(`
                action_type_id,
                key,
                category,
                name,
                unit,
                default_factor_id,
                default_factor:conversion_factors!action_types_default_factor_fk (
                    factor_id,
                    source,
                    unit_in,
                    unit_out,
                    value,
                    uncertainty,
                    notes
                )
            `)
            .eq("key", action_type_key)
            .single();

        if (atErr) return next(atErr);
        if (!actionType) return res.status(404).json({error: "Action type not found"});
        if (!actionType.default_factor) return res.status(500).json({error: "Action type has no default factor configured"});

        const factor = actionType.default_factor;

        if (actionType.unit !== factor.unit_in) {
            return res.status(400).json({
                error: `Unit mismatch: action type unit is "${actionType.unit}" but factor expects "${factor.unit_in}`,
            });
        }
        if (factor.unit_out !== "kg CO2e") {
            return res.status(400).json({
                error: `Unexpected factor output unit "${factor.unit_out}" (expected "kg CO2e")`,
            });
        }

        const calc = calculateCarbonFromFactor(quantity, factor);
        if (calc.error) return res.status(400).json({error: calc.error});

        // ANTI GAMING
        const today = new Date().toISOString().slice(0, 10);
        const LOG_RATE_WINDOW_SECONDS = 60;
        const MAX_LOGS_IN_WINDOW = 10;
        const MAX_SAME_ACTION_PER_DAY = 5;
        const MAX_CO2E_PER_LOG = 100;

        // UNREALISTIC LOGGING RATE
        const since = new Date(Date.now() - LOG_RATE_WINDOW_SECONDS * 1000).toISOString();

        const {data: recentLogs, error: rateErr} = await supabaseUser
            .from("action_logs")
            .select("log_id")
            .eq("user_id", demoUserId)
            .gte("created_at", since);

        if (rateErr) return next(rateErr);

        if ((recentLogs ?? []).length >= MAX_LOGS_IN_WINDOW) {
            return res.status(429).json({
                error: `You are logging too quickly. Maximum ${MAX_LOGS_IN_WINDOW} logs per ${LOG_RATE_WINDOW_SECONDS} seconds.`,
            });
        }

        // SAME ACTION TYPE LOGGED TOO MANY TIMES
        const {data: todayLogs, error: todayErr} = await supabaseUser
            .from("action_logs")
            .select("log_id")
            .eq("user_id", demoUserId)
            .eq("action_type_id", actionType.action_type_id)
            .eq("action_date", today);

        if (todayErr) return next(todayErr);

        if ((todayLogs ?? []).length >= MAX_SAME_ACTION_PER_DAY) {
            return res.status(400).json({
                error: `You have already logged "${actionType.name}" ${MAX_SAME_ACTION_PER_DAY} times today. Try a different action.`,
            });
        }

        // UNREALISTIC CO2E
        if (calc.estimateKgCO2e > MAX_CO2E_PER_LOG) {
            return res.status(400).json({
                error: `Caluclated CO2e (${calc.estimateKgCO2e.toFixed(2)}kg) exceeds the maximum allowed per log (${MAX_CO2E_PER_LOG}kg). Please check your quantity.`,
            });
        }

        // INSERT LOG INTO DATABASE
        
        const insertRow = {
            user_id: demoUserId,
            action_type_id: actionType.action_type_id,
            quantity: Number(quantity),
            action_date: new Date().toISOString().slice(0, 10),
            evidence_required: false,
            calculated_co2e: calc.estimateKgCO2e,
            score: Math.round(calc.estimateKgCO2e * 10),
        };

        const {data: inserted, error: insErr} = await supabaseAdmin
            .from("action_logs")
            .insert(insertRow)
            .select("*")
            .single();

        if (insErr) return next(insErr);

        await updateStreak(demoUserId);
        await checkAndAwardBadges(demoUserId);

        return res.status(201).json({
            log: inserted,
            calculation: calc,
            actionType: {
                key: actionType.key,
                name: actionType.name,
                category: actionType.category,
                unit: actionType.unit,
            },
        });
    } catch (err) {
        next(err);
    }
}

export async function listActionLogs(req, res, next) {
    try {
        const demoUserId = normalizeUserId(req.header("x-user-id") || req.query.user_id);
        if (!demoUserId) {
            return res.status(400).json({
                error: 'Missing user id. For now pass header "x-user-id" (or query user_id)',
            });
        }

        const { start, end } = req.query;

        let query = supabaseUser
            .from("action_logs")
            .select("log_id, user_id, action_type_id, quantity, action_date, calculated_co2e, score")
            .eq("user_id", demoUserId)
            .order("action_date", { ascending: true });

        if (start) query = query.gte("action_date", start);
        if (end) query = query.lte("action_date", end);

        const { data: logs, error } = await query;
        if (error) return next(error);

        return res.status(200).json({ logs: logs ?? [] });
    } catch (err) {
        next(err);
    }
}

async function updateStreak(userId) {
    const today = new Date().toISOString().split("T")[0];

    const {data: pet, error} = await supabaseUser
        .from("pets")
        .select("pet_id, streak, last_active_date")
        .eq("user_id", userId)
        .maybeSingle();

    if (error || !pet) return;

    const last = pet.last_active_date;

    if (last === today) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    const newStreak = last === yesterdayStr ? pet.streak + 1 : 1;

    await supabaseAdmin
        .from("pets")
        .update({
            streak: newStreak,
            last_active_date: today,
        })
        .eq("pet_id", pet.pet_id);
}
