import { Router } from "express";
import {createPet, getMyPet, listPetCatalog, updateNickname, revivePet, updatePetStats} from "../controllers/pets.controller.js";

const router = Router();

router.get("/catalog", listPetCatalog); // GET /pets/catalog
router.post("/", createPet); // POST /pets (use for choosing starting pet)
router.get("/me", getMyPet); // GET /pets/me
router.patch("/me/nickname", updateNickname); // PATCH /pets/me/nickaname
router.post("/me/revive", revivePet); // POST /pets/me/revive
router.patch("/me/stats", updatePetStats) // PATCH /pets/me/stats (should only be used by admins)

export default router;
