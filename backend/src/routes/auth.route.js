import { Router } from "express";
import {
    register,
    login,
    logout,
    refreshToken,
    changePassword,
    deleteAccount,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/authenticate.middleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", authenticate, logout);
router.post("/refresh", refreshToken);
router.patch("/password", authenticate, changePassword);
router.delete("/account", authenticate, deleteAccount);

export default router;