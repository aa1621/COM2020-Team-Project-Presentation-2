export function requireModerator(req, res) {
    const role = req.profile?.role;
    if (role !== "moderator" && role !== "maintainer") {
        res.status(403).json({error: 'Forbidden. Moderator or maintainer role required.'});
        return false;
    }
    return true;
}