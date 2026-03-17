import { Router } from "express";
import { getInventory, equipItem, unequipItem } from "../controllers/inventory.controller.js";

const router = Router();

router.get("/", getInventory); // GET /inventory
router.patch("/:itemId/equip", equipItem); // PATCH /inventory/:itemId/equip
router.patch("/:itemId/unequip", unequipItem); // PATCH /inventory/:itemId/unequip

export default router;