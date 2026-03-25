import { Router } from "express";
import { getEarnedBadges, listAllBadges } from "../controllers/badges.controller.js";

const router = Router();

router.get("/", getEarnedBadges); // GET /badges (Users earned badges)
router.get("/all", listAllBadges); // GET /badges/all (All badges on the site)

export default router;