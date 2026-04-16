import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response, NextFunction } from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import multer from "multer";
import { parseSTIL, parseFailLog } from "./server/parser.js";
import { computeHeatmap } from "./server/heatmapEngine.js";
import { runAdvancedInjection } from "./server/advancedInjectionEngine.js";
import { db, initDB } from "./config/db.js";
import { inferChipResult } from "./server/testerInference.js";
import { getHistoricalYieldTrend } from "./server/analytics/trendAnalyzer.js";
import { getGlobalHotspots, getWeakPatterns } from "./server/analytics/hotspotAnalyzer.js";
import { getRootCauseClusters } from "./server/analytics/rootCauseClusterer.js";
import { compareBatches } from "./server/analytics/batchComparator.js";
import { runDiagnosticPipeline } from "./server/services/pipelineService.js";

interface FaultInjectionParams {
  targets: Array<{ chainName: string; bitPosition: number; faultType: 'SA0' | 'SA1' }>;
  severity: number;
  clusterSize: number;
}

type MulterFiles = {
  [fieldname: string]: Express.Multer.File[];
};

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({ dest: uploadDir });

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT ?? 3000);

  // Initialize Database
  await initDB();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // API Routes
  app.post(
    "/api/analyze",
    upload.fields([
      { name: 'stil', maxCount: 1 },
      { name: 'failLog', maxCount: 1 },
    ]),
    async (req: Request, res: Response) => {
      try {
        const files = req.files as MulterFiles;
        if (!files?.stil || files.stil.length === 0) {
          return res.status(400).json({ error: "STIL file is required" });
        }

        const stilFile = files.stil[0];
        // Note: failLog integration into persistence pipeline can be added if needed,
        // currently focused on STIL persistence.
        const output = await runDiagnosticPipeline([stilFile], "Single_Execute_Pipeline");
        
        const mainResult = output.results[0];

        // Return unified structure expected by frontend
        return res.json({ 
          projectData: mainResult.projectData, 
          failingFFs: {}, // Dynamic log parsing can go here if needed
          isPersistent: true 
        });
      } catch (error) {
        console.error("Analysis error:", error);
        return res.status(500).json({ error: "Failed to analyze files" });
      }
    }
  );

  app.post("/api/bulk-analyze", upload.array('files'), async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const output = await runDiagnosticPipeline(files);
      return res.json(output);
    } catch (error: any) {
      console.error("Bulk analysis error:", error);
      return res.status(500).json({ 
        error: "Bulk analysis failed", 
        message: error.message || "Unknown error occurring during industrial parallel processing" 
      });
    }
  });

  app.get("/api/tester-summary", async (req, res) => {
    try {
      const [chips] = await db.query(`
        SELECT 
          c.id, c.batch_id, c.chip_id, c.status, c.mismatches, 
          c.yield_percent, c.total_scan_chains, c.total_flip_flops, 
          c.total_patterns, c.first_fail_pattern, c.created_at,
          b.batch_name, b.upload_timestamp 
        FROM chips c 
        JOIN upload_batches b ON c.batch_id = b.id 
        ORDER BY b.upload_timestamp DESC, c.id DESC
      `);
      
      const [failedChains] = await db.query("SELECT * FROM failed_chains");
      
      const result = (chips as any[]).map(chip => ({
        ...chip,
        failedChains: (failedChains as any[])
          .filter(fc => fc.chip_id === chip.id)
          .map(fc => fc.chain_name)
      }));

      return res.json(result);
    } catch (error) {
      console.error("Summary fetch error:", error);
      return res.status(500).json({ error: "Failed to fetch summary" });
    }
  });

  app.get("/api/chip/:chipId/failure-details", async (req, res) => {
    try {
      const { chipId } = req.params;
      
      const [chips] = await db.query("SELECT * FROM chips WHERE id = ?", [chipId]);
      if ((chips as any[]).length === 0) {
        return res.status(404).json({ error: "Chip not found" });
      }
      const chip = (chips as any[])[0];

      const [details] = await db.query("SELECT * FROM failure_details WHERE chip_id = ?", [chipId]);
      const [chains] = await db.query("SELECT * FROM failed_chains WHERE chip_id = ?", [chipId]);

      return res.json({
        chip,
        failedChains: chains,
        failureDetails: details
      });
    } catch (error) {
      console.error("Failure details fetch error:", error);
      return res.status(500).json({ error: "Failed to fetch failure details" });
    }
  });

  app.get("/api/analytics/yield-trend", async (req, res) => {
    try {
      const data = await getHistoricalYieldTrend();
      return res.json(data);
    } catch (error) {
      return res.status(500).json({ error: "Yield trend analysis failed" });
    }
  });

  app.get("/api/analytics/hotspots", async (req, res) => {
    try {
      const hotspots = await getGlobalHotspots();
      const patterns = await getWeakPatterns();
      return res.json({ hotspots, patterns });
    } catch (error) {
      return res.status(500).json({ error: "Hotspot analysis failed" });
    }
  });

  app.get("/api/analytics/root-causes", async (req, res) => {
    try {
      const clusters = await getRootCauseClusters();
      return res.json(clusters);
    } catch (error) {
      return res.status(500).json({ error: "Root cause analysis failed" });
    }
  });

  app.get("/api/analytics/compare/:idA/:idB", async (req, res) => {
    try {
      const { idA, idB } = req.params;
      const data = await compareBatches(parseInt(idA), parseInt(idB));
      return res.json(data);
    } catch (error) {
      return res.status(500).json({ error: "Comparison failed" });
    }
  });

  app.delete("/api/chip/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await db.query("DELETE FROM chips WHERE id = ?", [id]);
      return res.json({ success: true, message: "Record purged successfully" });
    } catch (error) {
      console.error("Deletion failed:", error);
      return res.status(500).json({ error: "Failed to delete diagnostic record" });
    }
  });

  app.get("/api/upload-batches", async (req, res) => {
    try {
      const [batches] = await db.query("SELECT * FROM upload_batches ORDER BY upload_timestamp DESC");
      res.json(batches);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch batches" });
    }
  });

  app.post("/api/inject-fault", upload.single('stil'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "STIL file is required" });
      }

      const stilText = req.file.path ? await fs.promises.readFile(req.file.path, 'utf-8') : req.file.buffer.toString('utf-8');
      if (req.file.path) {
        await fs.promises.unlink(req.file.path).catch(() => {});
      }
      const params = JSON.parse(req.body.params as string) as FaultInjectionParams;
      const result = runAdvancedInjection(stilText, params);

      return res.json(result);
    } catch (error) {
      console.error("Injection error:", error);
      return res.status(500).json({ error: error instanceof Error ? error.message : "Failed to inject fault" });
    }
  });

  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error("Global error:", err);
    if (req.path.startsWith('/api/')) {
      return res.status(500).json({ error: err.message || "Internal Server Error" });
    }
    return next(err);
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

