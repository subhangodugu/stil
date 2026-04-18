import { Router } from "express";
import multer from "multer";
import { uploadController } from "../controllers/uploadController.js";

const router = Router();
const upload = multer({ dest: "uploads/" });

/**
 * Industrial Diagnostic API Surface
 */

// Single STIL + Optional Log Analysis
router.post(
  "/analyze", 
  upload.fields([
    { name: "stil", maxCount: 1 },
    { name: "failLog", maxCount: 1 }
  ]), 
  uploadController.analyze
);

// Bulk STIL Processing
router.post(
  "/bulk-analyze", 
  upload.array("files"), 
  uploadController.bulkAnalyze
);

// Advanced Fault Injection (accepts STIL file OR pre-parsed projectDataJson)
router.post(
  "/inject-fault", 
  upload.single("stil"), 
  uploadController.injectFault
);

export default router;
