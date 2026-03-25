import { supabaseAdmin } from "../lib/supabaseClient.js";

export async function listUserLeaderboards(req, res, next) {
    try {
        const groupId = req.query?.group_id || null;
        const start = req.query?.start || null;
        const end = req.query?.end || null;

        const { data: groups, error: groupError } = await supabaseAdmin
            .from("groups")
            .select("group_id, name");

        if (groupError) return next(groupError);

        const groupNameById = new Map();
        for (const group of groups ?? []) {
            groupNameById.set(group.group_id, group.name);
        }

        const { data: users, error: userError } = await supabaseAdmin
            .from("users")
            .select("user_id, username, display_name, group_id");

        if (userError) return next(userError);

        const filteredUsers = (users ?? []).filter((user) => {
            if (!groupId) return true;
            return user.group_id === groupId;
        });

        const userIds = filteredUsers.map((user) => user.user_id);

        const petByUserId = new Map();
        if (userIds.length > 0) {
            const { data: pets, error: petError } = await supabaseAdmin
                .from("pets")
                .select("user_id, nickname, image_url")
                .in("user_id", userIds);

            if (petError) return next(petError);

            for (const pet of pets ?? []) {
                petByUserId.set(pet.user_id, pet);
            }
        }

        let logs = [];
        if (userIds.length > 0) {
            let logsQuery = supabaseAdmin
                .from("action_logs")
                .select("user_id, score")
                .in("user_id", userIds);

            if (start) logsQuery = logsQuery.gte("action_date", start);
            if (end) logsQuery = logsQuery.lte("action_date", end);

            const { data: actionLogs, error: logError } = await logsQuery;

            if (logError) return next(logError);
            logs = actionLogs ?? [];
        }

        const totals = new Map();
        for (const log of logs) {
            const points = Number(log.score || 0);
            totals.set(log.user_id, (totals.get(log.user_id) || 0) + points);
        }

        const leaderboard = filteredUsers
            .map((user) => ({
                user_id: user.user_id,
                username: user.username,
                display_name: user.display_name,
                group_id: user.group_id,
                group_name: user.group_id ? groupNameById.get(user.group_id) || null : null,
                pet_name: petByUserId.get(user.user_id)?.nickname || null,
                pet_image_url: petByUserId.get(user.user_id)?.image_url || null,
                points: totals.get(user.user_id) || 0,
            }))
            .sort((a, b) => {
                if (b.points !== a.points) return b.points - a.points;
                const nameA = (a.display_name || a.username || "").toLowerCase();
                const nameB = (b.display_name || b.username || "").toLowerCase();
                return nameA.localeCompare(nameB);
            });

        return res.status(200).json({ leaderboards: leaderboard });
    } catch (err) {
        next(err);
    }
}

export async function listGroupLeaderboards(req, res, next) {
    try {
        const start = req.query?.start || null;
        const end = req.query?.end || null;

        const { data: groups, error: groupError } = await supabaseAdmin
            .from("groups")
            .select("group_id, name, type");

        if (groupError) return next(groupError);

        const { data: users, error: userError } = await supabaseAdmin
            .from("users")
            .select("user_id, group_id");

        if (userError) return next(userError);

        const usersByGroup = new Map();
        for (const user of users ?? []) {
            if (!user.group_id) continue;
            usersByGroup.set(user.group_id, (usersByGroup.get(user.group_id) || 0) + 1);
        }

        const userIds = (users ?? [])
            .map((user) => user.user_id)
            .filter(Boolean);

        let logs = [];
        if (userIds.length > 0) {
            let logsQuery = supabaseAdmin
                .from("action_logs")
                .select("user_id, score")
                .in("user_id", userIds);

            if (start) logsQuery = logsQuery.gte("action_date", start);
            if (end) logsQuery = logsQuery.lte("action_date", end);

            const { data: actionLogs, error: logError } = await logsQuery;

            if (logError) return next(logError);
            logs = actionLogs ?? [];
        }

        const groupIdByUserId = new Map();
        for (const user of users ?? []) {
            if (user.user_id) {
                groupIdByUserId.set(user.user_id, user.group_id ?? null);
            }
        }

        const totals = new Map();
        for (const log of logs) {
            const groupId = groupIdByUserId.get(log.user_id);
            if (!groupId) continue;

            const points = Number(log.score || 0);
            totals.set(groupId, (totals.get(groupId) || 0) + points);
        }

        const leaderboard = (groups ?? [])
            .map((group) => ({
                group_id: group.group_id,
                name: group.name,
                type: group.type ?? null,
                member_count: usersByGroup.get(group.group_id) || 0,
                points: totals.get(group.group_id) || 0,
            }))
            .sort((a, b) => {
                if (b.points !== a.points) return b.points - a.points;
                return (a.name || "").localeCompare(b.name || "");
            });

        return res.status(200).json({ leaderboards: leaderboard });
    } catch (err) {
        next(err);
    }
}
