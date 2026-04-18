import { Router } from "express";
import { chipController } from "../controllers/chipController.js";

const router = Router();

router.get("/summary", chipController.getSummary);
router.get("/batch/:chipId/details", chipController.getFailureDetails); // Matching legacy path pattern
router.get("/upload-batches", chipController.getBatches);
router.delete("/purge/:id", chipController.deleteChip);
router.delete("/reset-all", chipController.resetAll);

export default router;
