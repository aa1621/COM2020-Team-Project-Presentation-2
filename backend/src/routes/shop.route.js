import { Router } from "express";
import { listShopItems, buyItem } from "../controllers/shop.controller.js";

const router = Router();

router.get("/", listShopItems); // GET /shop
router.post("/buy/:itemId", buyItem) // POST /shop/buy/:itemId

export default router;