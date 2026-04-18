import { Request, Response } from "express";
import { getHistoricalYieldTrend } from "../analytics/trendAnalyzer.js";
import { getGlobalHotspots, getWeakPatterns } from "../analytics/hotspotAnalyzer.js";
import { getRootCauseClusters } from "../analytics/rootCauseClusterer.js";
import { compareBatches } from "../analytics/batchComparator.js";

export const analyticsController = {
  getYieldTrend: async (req: Request, res: Response) => {
    try {
      const data = await getHistoricalYieldTrend();
      return res.json(data);
    } catch (error) {
      console.error("Yield trend error:", error);
      return res.status(500).json({ error: "Yield trend analysis failed" });
    }
  },

  getHotspots: async (req: Request, res: Response) => {
    try {
      const hotspots = await getGlobalHotspots();
      const patterns = await getWeakPatterns();
      return res.json({ hotspots, patterns });
    } catch (error) {
      console.error("Hotspot error:", error);
      return res.status(500).json({ error: "Hotspot analysis failed" });
    }
  },

  getRootCauses: async (req: Request, res: Response) => {
    try {
      const clusters = await getRootCauseClusters();
      return res.json(clusters);
    } catch (error) {
      console.error("Root cause error:", error);
      return res.status(500).json({ error: "Root cause analysis failed" });
    }
  },

  compare: async (req: Request, res: Response) => {
    try {
      const { idA, idB } = req.params;
      const data = await compareBatches();
      return res.json(data);
    } catch (error) {
      console.error("Comparison error:", error);
      return res.status(500).json({ error: "Comparison failed" });
    }
  }
};
