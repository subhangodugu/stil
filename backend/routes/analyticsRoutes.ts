import { Router } from "express";
import { analyticsController } from "../controllers/analyticsController.js";

const router = Router();

router.get("/yield-trend", analyticsController.getYieldTrend);
router.get("/hotspots", analyticsController.getHotspots);
router.get("/root-causes", analyticsController.getRootCauses);
router.get("/compare/:idA/:idB", analyticsController.compare);

export default router;
