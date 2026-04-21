import { Router } from "express";
import { aiController } from "../controllers/aiController.js";

const router = Router();

router.post("/insight", aiController.getInsight);
router.post("/analyze", aiController.analyzeStil);

export default router;
