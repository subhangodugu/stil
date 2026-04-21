import { generateAIInsight, auditSTILFile } from "../services/aiService.js";
import { db, query } from "../config/db.js";
import crypto from "crypto";
import { asyncHandler } from "../utils/AsyncHandler.js";

export const aiController = {
  getInsight: asyncHandler(async (req, res) => {
    const { chipId, data, aiConfig } = req.body;
    const { apiKey, model } = aiConfig || {};
    const failureHash = crypto.createHash('sha256').update(JSON.stringify(JSON.parse(JSON.stringify(data, Object.keys(data).sort())))).digest('hex');

    const [cached] = await query<any>("SELECT insight, created_at FROM ai_insights WHERE chip_id = ? AND failure_hash = ? LIMIT 1", [chipId, failureHash]);
    if (cached) return res.json({ insight: cached.insight, source: 'cache', generatedAt: cached.created_at });

    // --- 📡 Industrial Signature Pre-processor ---
    // Extract deeper signals for defect classification
    try {
      // 1. Gather all failures for this chip to detect synchronicity
      const allFails = await query<any>("SELECT pattern_id, chain_name, flip_flop_position FROM failure_details WHERE chip_id = ?", [chipId]);
      
      if (allFails.length > 0) {
        // Pattern Synchronicity: % of patterns failing in more than one chain
        const patternMap: Record<string, Set<string>> = {};
        allFails.forEach(f => {
          if (!patternMap[f.pattern_id]) patternMap[f.pattern_id] = new Set();
          patternMap[f.pattern_id].add(f.chain_name);
        });
        
        const multiChainPatterns = Object.values(patternMap).filter(chains => chains.size > 1).length;
        data.patternSynchronicity = multiChainPatterns / Object.keys(patternMap).length;

        // Cluster Density: % of fails clumped in a 10-FF window
        const chainFails = allFails.filter((f: any) => f.chain_name === data.selectedChain);
        if (chainFails.length > 1) {
          const positions = chainFails.map((f: any) => f.flip_flop_position).sort((a: number, b: number) => a - b);
          let clumped = 0;
          for (let i = 0; i < positions.length - 1; i++) {
            if (positions[i + 1] - positions[i] < 10) clumped++;
          }
          data.clusterDensity = clumped / positions.length;
        }

        // Adjacency Context: Which indices are failing?
        const failingChainNames = [...new Set(allFails.map((f: any) => f.chain_name))];
        const [chipMeta] = await query<any>("SELECT project_data FROM chips WHERE id = ?", [chipId]);
        if (chipMeta?.project_data?.scanChains) {
          const chains = chipMeta.project_data.scanChains;
          data.failedChainIndices = failingChainNames.map(name => chains.findIndex((c: any) => c.name === name)).filter(idx => idx !== -1);
          
          // Clock Domain Correlation
          const selectedChainData = chains.find((c: any) => c.name === data.selectedChain);
          if (selectedChainData?.ffs?.[0]?.clockDomain) {
            data.commonClockDomain = selectedChainData.ffs[0].clockDomain;
          }
        }
      }
    } catch (e) {
      console.warn("[AI_SIGNATURE_GEN] Failed to process forensic signatures:", e);
    }

    const insight = await generateAIInsight(data, apiKey, model);
    await db.query("INSERT INTO ai_insights (chip_id, failure_hash, insight) VALUES (?, ?, ?)", [chipId, failureHash, insight]);
    return res.json({ insight, source: 'fresh', generatedAt: new Date() });
  }),

  /**
   * Industrial STIL Auditor: Analyzes raw STIL structures.
   */
  analyzeStil: asyncHandler(async (req, res) => {
    const { stilContent, aiConfig } = req.body;
    const { apiKey, model } = aiConfig || {};
    if (!stilContent) return res.status(400).json({ error: "Missing STIL content" });
    
    // Perform AI Audit
    const audit = await auditSTILFile(stilContent, apiKey, model);
    return res.json(JSON.parse(audit));
  })
};
