import { Request, Response } from "express";
import { runDiagnosticPipeline } from "../services/pipelineService.js";
import { runAdvancedInjection } from "../services/advancedInjectionEngine.js";
import fs from "fs";
import { logger } from "../utils/logger.js";

export const uploadController = {
  analyze: async (req: Request, res: Response) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      if (!files?.stil || files.stil.length === 0) {
        return res.status(400).json({ error: "STIL file is required" });
      }

      const stilFile = files.stil[0];
      const failLogText = files.failLog?.[0]?.path 
        ? await fs.promises.readFile(files.failLog[0].path, 'utf-8') 
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
    }
  },

  bulkAnalyze: async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
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
    }
  },

  injectFault: async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "STIL file is required" });
      }

      const stilText = req.file.path 
        ? await fs.promises.readFile(req.file.path, 'utf-8') 
        : req.file.buffer.toString('utf-8');

      if (req.file.path) {
        await fs.promises.unlink(req.file.path).catch(() => {});
      }

      const params = JSON.parse(req.body.params as string);
      const result = runAdvancedInjection(stilText, params);

      return res.json(result);
    } catch (error) {
      logger.error("Injection error:", error);
      return res.status(500).json({ error: "Failed to inject fault" });
    }
  }
};
