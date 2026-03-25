import Router from "express";
import {
    listGroupLeaderboards,
    listUserLeaderboards,
} from "../controllers/leaderboards.controller.js";

const router = Router();

router.get("/users", listUserLeaderboards);
router.get("/groups", listGroupLeaderboards);

export default router;
