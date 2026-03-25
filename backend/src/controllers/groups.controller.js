import { supabaseAdmin, supabaseUser } from "../lib/supabaseClient.js";

// const DEMO_USER_ID =
//     process.env.DEMO_USER_ID || "c1aae9c3-5157-4a26-a7b3-28d8905cfef0";

// function normalizeUserId(raw) {
//     if (!raw) return null;
//     const uuidV4ish =
//         /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
//     if (uuidV4ish.test(raw)) return raw;
//     if (raw == "demo-flynn" || raw == "demo") return DEMO_USER_ID;
//     return raw;
// }

export async function listGroups(req, res, next) {
    try {
        const { data: groups, error } = await supabaseUser
            .from("groups")
            .select("group_id, name, type, created_at")
            .order("name", { ascending: true });

        if (error) return next(error);

        const { data: users, error: usersError } = await supabaseUser
            .from("users")
            .select("group_id");

        if (usersError) return next(usersError);

        const counts = new Map();
        for (const user of users ?? []) {
            if (!user.group_id) continue;
            counts.set(user.group_id, (counts.get(user.group_id) || 0) + 1);
        }

        const payload = (groups ?? []).map((group) => ({
            ...group,
            member_count: counts.get(group.group_id) || 0,
        }));

        return res.status(200).json({ groups: payload });
    } catch (err) {
        next(err);
    }
}

export async function joinGroup(req, res, next) {
    try {
        const userId = req.user.id;
        // if (!userId) {
        //     return res.status(400).json({
        //         error: 'Missing user id. For now pass header "x-user-id" (or body user_id)',
        //     });
        // }

        const rawGroupId = req.body?.group_id ?? null;
        const groupId = rawGroupId || null;
        let group = null;

        if (groupId) {
            const { data: groupRow, error: groupError } = await supabaseUser
                .from("groups")
                .select("group_id, name, type, created_at")
                .eq("group_id", groupId)
                .single();

            if (groupError) return next(groupError);
            if (!groupRow) {
                return res.status(404).json({ error: "Group not found" });
            }
            group = groupRow;
        }

        const {data: currentUser} = await supabaseUser
            .from("users")
            .select("group_id")
            .eq("user_id", userId)
            .single();

        const previousGroupId = currentUser?.group_id ?? null;

        const { data: updatedUser, error: updateError } = await supabaseAdmin
            .from("users")
            .update({ group_id: groupId })
            .eq("user_id", userId)
            .select("user_id, username, display_name, role, group_id")
            .single();

        if (updateError) return next(updateError);

        if (groupId) {
            await supabaseAdmin
                .from("group_memberships")
                .upsert(
                    {group_id: groupId, user_id: userId, role:"member"},
                    {onConflict: "group_id,user_id"}
                );
        } else if (previousGroupId) {
            await supabaseAdmin
                .from("group_memberships")
                .delete()
                .eq("user_id", userId)
                .eq("group_id", previousGroupId);
        }

        return res.status(200).json({ user: updatedUser, group }); 

       
    } catch (err) {
        next(err);
    }
}

export async function createGroup(req, res, next) {
    try {
        const userId = req.user.id;
        // if (!userId) {
        //     return res.status(400).json({
        //         error: 'Missing user id. For now use header "x-user-id" (or body user_id)',
        //     });
        // }

        const name = (req.body?.name || "").trim();
        if (!name) {
            return res.status(400).json({error: "Group name is required"});
        }

        const type = (req.body?.type || "society").trim();

        const {data: group, error: groupErr} = await supabaseAdmin
            .from("groups")
            .insert({
                name,
                type,
                created_by: userId,
            })
            .select("group_id, name, type, created_at, created_by")
            .single();

        if (groupErr) return next(groupErr);

        const {data: updatedUser, error: updateErr} = await supabaseAdmin
            .from("users")
            .update({group_id: group.group_id})
            .eq("user_id", userId)
            .select("user_id, username, display_name, role, group_id")
            .single();

        if (updateErr) return next(updateErr);

        const {error: membershipErr} = await supabaseAdmin
            .from("group_memberships")
            .upsert(
                {group_id: group.group_id, user_id: userId, role: "moderator"},
                {onConflict: "group_id,user_id"}
            );

        if (membershipErr) return next(membershipErr);

        return res.status(201).json({group, user: updatedUser});
    } catch (err) {
        next(err);
    }
}

export async function createInvite(req, res, next) {
  try {
    //console.log("BODY:", req.body);

    const inviterId = req.user.id;
    // if (!inviterId) {
    //   return res.status(400).json({ error: 'Missing user id (header "x-user-id")' });
    // }

    const { groupId } = req.params;
    const message = (req.body?.message || "").trim() || null;

    const { data: group, error: gErr } = await supabaseUser
      .from("groups")
      .select("group_id, name, type, created_at, created_by")
      .eq("group_id", groupId)
      .maybeSingle();

    if (gErr) return next(gErr);
    if (!group) return res.status(404).json({ error: "Group not found" });

    const invited_user_id = req.body?.invited_user_id ?? null;
    const username = (req.body?.username || "").trim();

    if (!invited_user_id && !username) {
      return res.status(400).json({ error: 'Provide "invited_user_id" or "username"' });
    }

    let invitedUser = null;

    if (invited_user_id) {
      const { data, error } = await supabaseUser
        .from("users")
        .select("user_id, username, display_name, group_id")
        .eq("user_id", invited_user_id)
        .maybeSingle();

      if (error) return next(error);
      invitedUser = data;
    } else {
      const { data, error } = await supabaseUser
        .from("users")
        .select("user_id, username, display_name, group_id")
        .eq("username", username)
        .maybeSingle();

      if (error) return next(error);
      invitedUser = data;
    }

    if (!invitedUser) return res.status(404).json({ error: "Invited user not found" });
    if (invitedUser.user_id === inviterId) {
      return res.status(400).json({ error: "You cannot invite yourself" });
    }

    if (invitedUser.group_id === groupId) {
      return res.status(409).json({ error: "User is already in the group" });
    }

    const { data: invite, error: iErr } = await supabaseAdmin
      .from("group_invites")
      .insert({
        group_id: groupId,
        invited_user_id: invitedUser.user_id,
        invited_by_user_id: inviterId,
        message,
        status: "pending",
      })
      .select("*")
      .single();

    if (iErr) {
      if (iErr.code === "23505") {
        return res
          .status(409)
          .json({ error: "An invite is already pending for this user in this group." });
      }
      return next(iErr);
    }

    return res.status(201).json({
      invite,
      group: { group_id: group.group_id, name: group.name, type: group.type },
      invitedUser: {
        user_id: invitedUser.user_id,
        username: invitedUser.username,
        display_name: invitedUser.display_name,
      },
    });
  } catch (err) {
    next(err);
  }
}
