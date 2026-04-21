import { Router } from "express";
import multer from "multer";
import { uploadController } from "../controllers/uploadController.js";

const router = Router();
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB Limit
  fileFilter: (req, file, cb) => {
    const allowedExtensions = /\.(stil|log|txt|json)$/i;
    if (allowedExtensions.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error("Industrial Guard: Invalid file type. Only .stil, .log, .txt, and .json are permitted."));
    }
  }
});

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
