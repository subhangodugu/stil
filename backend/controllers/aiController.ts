import { Request, Response } from "express";
import { generateAIInsight } from "../services/aiService.js";
import { db } from "../config/db.js";
import crypto from "crypto";

export const aiController = {
  getInsight: async (req: Request, res: Response) => {
    try {
      const { chipId, data } = req.body;
      if (!chipId || !data) {
        return res.status(400).json({ error: "Missing chipId or diagnostic data" });
      }

      // 1. Generate SHA-256 failure hash for precision caching
      const failureSummary = JSON.stringify(data);
      const failureHash = crypto.createHash('sha256').update(failureSummary).digest('hex');

      // 2. Check Database Cache
      const [existing]: any = await db.query(
        "SELECT insight, created_at FROM ai_insights WHERE chip_id = ? AND failure_hash = ? LIMIT 1",
        [chipId, failureHash]
      );

      if (existing.length > 0) {
        return res.json({ 
          insight: existing[0].insight, 
          source: 'cache',
          generatedAt: existing[0].created_at 
        });
      }

      // 3. Cache Miss -> Generate via Service Layer
      const insight = await generateAIInsight(data);

      // 4. Persist
      await db.query(
        "INSERT INTO ai_insights (chip_id, failure_hash, insight) VALUES (?, ?, ?)",
        [chipId, failureHash, insight]
      );

      return res.json({ 
        insight, 
        source: 'fresh',
        generatedAt: new Date()
      });
    } catch (error) {
      console.error("[AI CONTROLLER ERROR]", error);
      return res.status(500).json({ error: "Failed to generate AI insight" });
    }
  }
};
