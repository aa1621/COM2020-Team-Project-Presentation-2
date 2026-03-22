import { Router } from 'express'
import {
    listChallenges,
    getChallenge,
    listChallengeSubmissions,
    listUserSubmissions,
    createChallenge,
    updateChallenge,
    deactivateChallenge,
} from '../controllers/challenges.controller.js';

const router = Router();

router.get("/challenges", listChallenges);
router.get("/challenges/:challengeId", getChallenge);
router.get("/challenges/:challengeId/submissions", listChallengeSubmissions);
router.get("/users/:userId/submissions", listUserSubmissions);

// MODERATOR ONLY
router.post("/", createChallenge);
router.patch("/:challengeId", updateChallenge);
router.delete("/:challengeId", deactivateChallenge);

export default router;