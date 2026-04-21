import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { initDB } from "./config/db.js";

// Industrial Modular Routes
import uploadRoutes from "./routes/uploadRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import chipRoutes from "./routes/chipRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import { logger } from "./utils/logger.js";
import { IndustrialError } from "./utils/IndustrialError.js";
import compression from "compression";

import { createServer } from "http";
import { WebSocketServer } from "ws";
import { streamDeterministicSimulation } from "./services/deterministicEngine.js";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const PORT = Number(process.env.PORT ?? 3000);

  // 0. Accelerate Network Response
  app.use(compression());

  // 1. Initialize WebSocket Server for Real-Time Telemetry
  const wss = new WebSocketServer({ server: httpServer });
  (global as any).wss = wss; // Expose globally for controllers to broadcast ingestion progress

  wss.on("connection", (ws) => {
    logger.info("🔌 Live Diagnostic Client Connected");

    ws.on("message", async (message) => {
      try {
        const { type, payload } = JSON.parse(message.toString());

        if (type === "START_STREAMING_DIAGNOSTIC") {
          const { parsedSTIL, logMap } = payload;
          logger.info(`🚀 Starting Streaming Diagnostic for ${parsedSTIL.patternBurst}`);

          // Industrial Throtte: Optimized for Network Efficiency (v5)
          let cycleBatch = [];
          const THROTTLE_SHUTTLE = 5000; 

          for await (const result of streamDeterministicSimulation(parsedSTIL.patterns, logMap)) {
            cycleBatch.push(result);

            if (cycleBatch.length >= THROTTLE_SHUTTLE) {
              ws.send(JSON.stringify({ type: "TELEMETRY_BATCH", data: cycleBatch }));
              cycleBatch = [];
              // Tiny yield to prevent event loop starvation on large files
              await new Promise(r => setTimeout(r, 0));
            }
          }

          // Flush remaining
          if (cycleBatch.length > 0) {
            ws.send(JSON.stringify({ type: "TELEMETRY_BATCH", data: cycleBatch }));
          }

          ws.send(JSON.stringify({ type: "DIAGNOSTIC_COMPLETE" }));
        }
      } catch (err) {
        logger.error("WebSocket Stream Error:", err);
        ws.send(JSON.stringify({ type: "ERROR", message: "Streaming failed" }));
      }
    });

    ws.on("close", () => logger.info("🔌 Client Disconnected"));
  });

  // (rest of the express setup remains same, just replacing app.listen with httpServer.listen)
  await initDB();

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  app.use("/api/uploads", uploadRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/data", chipRoutes); 
  app.use("/api/ai", aiRoutes);

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    logger.info("🛠️  Development Mode: API Server only. Frontend should run via 'npm run dev'");
    app.get('/', (req, res) => {
      res.send("STIL Analyzer API is running. Access the frontend via Vite dev server.");
    });
  }

  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof IndustrialError) {
      logger.warn(`[INDUSTRIAL ERROR] ${err.code}: ${err.message}`);
      return res.status(err.status).json({ 
        error: err.code, 
        message: err.message,
        timestamp: new Date().toISOString()
      });
    }

    logger.error("[CRITICAL SYSTEM ERROR]", err);
    return res.status(500).json({ 
      error: "INDUSTRIAL_CRITICAL_FAILURE", 
      message: process.env.NODE_ENV === 'production' ? "Internal server error" : (err as Error).message 
    });
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    logger.info(`
🚀 INDUSTRIAL DIAGNOSTIC CORE ACTIVE (WS ENABLED)
--------------------------------------------------
PORT: ${PORT}
DB STATUS: CONNECTED & SYNCHRONIZED
LOGIC LAYER: MODULAR & DECOUPLED
TELEMETRY: WEBSOCKET STREAMING READY
--------------------------------------------------
    `);
  });
}


export const broadcast = (data: any) => {
  const wss = (global as any).wss as WebSocketServer;
  if (!wss) return;
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(data));
    }
  });
};

startServer();
