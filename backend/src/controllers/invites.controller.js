import { supabaseAdmin } from "../lib/supabaseClient.js";

// const DEMO_USER_ID = 
//     process.env.DEMO_USER_ID || "c1aae9c3-5157-4a26-a7b3-28d8905cfef0";

// function normalizeUserId(raw) {
//     if (!raw) return null;
//     const uuidV4ish =
//         /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
//     if (uuidV4ish.test(raw)) return raw;
//     if (raw === "demo-flynn" || raw === "demo") return DEMO_USER_ID;
//     return raw;
// }

export async function listInvites(req, res, next) {
    try {
        const userId = req.user.id;
        // if (!userId) return res.status(400).json({error: 'Missing "x-user-id" header'});

        const {data, error} = await supabaseAdmin
            .from("group_invites")
            .select(`
                invite_id, group_id, invited_user_id, invited_by_user_id, status, message, created_at, responded_at,
                groups:groups ( group_id, name, type ),
                inviter:users!group_invites_invited_by_user_id_fkey ( user_id, username, display_name )
            `)
            .eq("invited_user_id", userId)
            .order("created_at", {ascending: false});

        if (error) return next(error);

        res.json({invites: data ?? []});
    } catch (err) {
        next(err);
    }
}

export async function respondToInvite(req, res, next) {
    try {
        const userId = req.user.id;
        // if (!userId) return res.status(400).json({error: 'Missing "x-user-id" header'});

        const {inviteId} = req.params;
        const decision = req.body?.decision;

        if (!decision || !["accept", "decline"].includes(decision)) {
            return res.status(400).json({error: 'decision must be "accept" or "decline"'});
        }

        const {data: invite, error: invErr} = await supabaseAdmin
            .from("group_invites")
            .select("*")
            .eq("invite_id", inviteId)
            .single();
        
        if (invErr) return next(invErr);
        if (!invite) return res.status(404).json({error: "Invite not found"});

        if (invite.invited_user_id !== userId) {
            return res.status(403).json({error: "You are not the invited user for this invite"});
        }

        const newStatus = decision === "accept" ? "accepted" : "declined";

        const {data: updatedInvite, error: updErr} = await supabaseAdmin
            .from("group_invites")
            .update({status: newStatus, responded_at: new Date().toISOString()})
            .eq("invite_id", inviteId)
            .select("*")
            .single();

        if (updErr) return next(updErr);

        if (newStatus === "accepted") {
            const {error: userErr} = await supabaseAdmin
                .from("users")
                .update({group_id: invite.group_id})
                .eq("user_id", userId);

            if (userErr) return next(userErr);

            const {error: memErr} = await supabaseAdmin
                .from("group_memberships")
                .upsert(
                    {group_id: invite.group_id, user_id: userId, role: "member"},
                    {onConflict: "group_id,user_id"}
                );

            if (memErr) return next(memErr);
        }

        res.json({invite: updatedInvite});
    } catch (err) {
        next(err);
    }
}
