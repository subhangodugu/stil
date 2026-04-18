import { Request, Response } from "express";
import { runDiagnosticPipeline } from "../services/pipelineService.js";
import { runAdvancedInjection, runAdvancedInjectionFromProjectData } from "../services/advancedInjectionEngine.js";
import fs from "fs";
import { logger } from "../utils/logger.js";

export const uploadController = {
  analyze: async (req: Request, res: Response) => {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    try {
      if (!files?.stil || files.stil.length === 0) {
        return res.status(400).json({ error: "STIL file is required" });
      }

      const stilFile = files.stil[0];
      const failLogText = files.failLog?.[0]?.path 
        ? await fs.promises.readFile(files.failLog[0].path, 'utf-8') 
        : files.failLog?.[0]?.buffer 
          ? files.failLog[0].buffer.toString('utf-8')
          : undefined;

      const output = await runDiagnosticPipeline([stilFile], "Single_Execute_Pipeline", failLogText);
      const mainResult = output.results[0];

      return res.json({ 
        projectData: mainResult, 
        isPersistent: true 
      });
    } catch (error) {
      logger.error("Analysis error:", error);
      return res.status(500).json({ error: "Failed to analyze files" });
    } finally {
      // Emergency Cleanup
      const allFiles = [...(files?.stil || []), ...(files?.failLog || [])];
      for (const f of allFiles) {
        if (f.path && fs.existsSync(f.path)) {
          await fs.promises.unlink(f.path).catch(() => {});
        }
      }
    }
  },

  bulkAnalyze: async (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[];
    try {
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const output = await runDiagnosticPipeline(files, "Bulk_Execute_Pipeline");
      return res.json(output);
    } catch (error: unknown) {
      const err = error as { message?: string };
      logger.error("Bulk analysis error:", error);
      return res.status(500).json({ 
        error: "Bulk analysis failed", 
        message: err.message || "Industrial parallel processing error" 
      });
    } finally {
      // Emergency Cleanup for bulk
      if (files && Array.isArray(files)) {
        for (const f of files) {
          if (f.path && fs.existsSync(f.path)) {
            await fs.promises.unlink(f.path).catch(() => {});
          }
        }
      }
    }
  },

  injectFault: async (req: Request, res: Response) => {
    try {
      const params = JSON.parse(req.body.params as string);

      // --- Mode A: Pre-parsed projectData JSON (from drill-down view, no STIL re-upload needed) ---
      if (req.body.projectDataJson) {
        const stilMetadata = JSON.parse(req.body.projectDataJson as string);
        const result = runAdvancedInjectionFromProjectData(stilMetadata, params);
        return res.json(result);
      }

      // --- Mode B: Raw STIL file uploaded (from normal upload flow) ---
      if (!req.file) {
        return res.status(400).json({ error: "Either a STIL file or projectDataJson body field is required" });
      }

      const stilText = req.file.path
        ? await fs.promises.readFile(req.file.path, 'utf-8')
        : req.file.buffer.toString('utf-8');

      if (req.file.path) {
        await fs.promises.unlink(req.file.path).catch(() => {});
      }

      const result = runAdvancedInjection(stilText, params);
      return res.json(result);
    } catch (error) {
      logger.error("Injection error:", error);
      return res.status(500).json({ error: "Failed to inject fault" });
    }
  }
};
