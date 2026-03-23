import { supabaseUser } from '../lib/supabaseClient.js';

/** 
 * GET /action-types
 * Returns action types plus their default conversion factor (for transparency).
 */

export async function getActionTypes(req, res, next) {
    try {
        const { data, error } = await supabaseUser
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
            .order("category", {ascending: true})
            .order("name", {ascending: true});
        
            if (error) return next(error);

            const payload = (data ?? []).map((row) => ({
                action_type_id: row.action_type_id,
                key: row.key,
                category: row.category,
                name: row.name,
                unit: row.unit,
                default_factor_id: row.default_factor_id,
                factor: row.default_factor ?? null,
            }));

            res.json({actionTypes: payload});
    } catch (err) {
        next(err);
    }
}