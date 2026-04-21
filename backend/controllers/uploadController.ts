import { Request, Response } from "express";
import { runDiagnosticPipeline } from "../services/pipelineService.js";
import { runAdvancedInjection, runAdvancedInjectionFromProjectData } from "../services/advancedInjectionEngine.js";
import fs from "fs";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { broadcast } from "../server.js";
import { query } from "../config/db.js";

const readFile = (f: any) => f?.path ? fs.promises.readFile(f.path, 'utf-8') : f?.buffer?.toString('utf-8');
const cleanup = async (files: any[]) => await Promise.all(files.filter(f => f?.path).map(f => fs.promises.unlink(f.path).catch(() => {})));

export const uploadController = {
  analyze: asyncHandler(async (req, res) => {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    // --- 🐘 INDUSTRIAL HYDRATION LAYER ---
    let preParsed = req.body.projectDataJson ? JSON.parse(req.body.projectDataJson) : null;
    
    if (req.body.chipId && !preParsed) {
      const [chip] = await query<any>("SELECT project_data FROM chips WHERE id = ?", [req.body.chipId]);
      if (chip?.project_data) {
        preParsed = typeof chip.project_data === 'string' ? JSON.parse(chip.project_data) : chip.project_data;
      }
    }
    const failLogText = await readFile(files.failLog?.[0]);

    const output = await runDiagnosticPipeline([files?.stil?.[0] || { originalname: "synthetic.stil", buffer: Buffer.from(""), path: null } as any], "Single_Execute_Pipeline", failLogText, preParsed);
    const mainResult = output.results[0] as any;

    const failingFFs: Record<string, number> = {};
    mainResult.failureDetails?.forEach((d: any) => failingFFs[`${d.chainName}:FF_${d.flipFlopPosition}`] = (failingFFs[`${d.chainName}:FF_${d.flipFlopPosition}`] || 0) + 1);

    await cleanup([...(files?.stil || []), ...(files?.failLog || [])]);
    return res.json({ projectData: output.lastParsed, chipResult: mainResult, failingFFs, isPersistent: true });
  }),

  bulkAnalyze: asyncHandler(async (req, res) => {
    const files = req.files as Express.Multer.File[];
    
    const output = await runDiagnosticPipeline(
      files, 
      "Bulk_Execute_Pipeline", 
      undefined, 
      undefined,
      (progress) => {
        broadcast({ type: "INGESTION_PROGRESS", ...progress });
      }
    );
    
    await cleanup(files);
    
    const successCount = output.results.length;
    const failCount = files.filter(f => /\.(stil|stf)$/i.test(f.originalname)).length - successCount;

    return res.json({
      ...output,
      manifest: {
        total: files.length,
        success: successCount,
        failed: Math.max(0, failCount)
      }
    });
  }),

  injectFault: asyncHandler(async (req, res) => {
    const params = typeof req.body.params === 'string' ? JSON.parse(req.body.params) : req.body.params;
    
    // --- 🐘 INDUSTRIAL HYDRATION LAYER ---
    let projectData = req.body.projectDataJson;
    
    if (req.body.chipId && !projectData) {
      const [chip] = await query<any>("SELECT project_data FROM chips WHERE id = ?", [req.body.chipId]);
      if (chip?.project_data) {
        projectData = typeof chip.project_data === 'string' ? JSON.parse(chip.project_data) : chip.project_data;
      }
    }

    if (typeof projectData === 'string') {
      try {
        projectData = JSON.parse(projectData);
      } catch (e) {
        console.warn("Soft Recovery: Malformed projectDataJson, falling back to raw STIL.");
        projectData = null;
      }
    }

    if (projectData) {
      return res.json(runAdvancedInjectionFromProjectData(projectData, params));
    }
    
    const stilText = await readFile(req.file);
    if (req.file?.path) await fs.promises.unlink(req.file.path).catch(() => {});
    return res.json(runAdvancedInjection(stilText, params));
  })
};
