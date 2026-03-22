export function requireModerator(req, res) {
    const role = req.header("x-user-role");
    if (role !== "moderator" && role !== "maintainer") {
        res.status(403).json({error: 'Forbidden. Set header "x-user-role: moderator" for dev.'});
        return false;
    }
    return true;
}