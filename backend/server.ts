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

import { createServer } from "http";
import { WebSocketServer } from "ws";
import { streamDeterministicSimulation } from "./services/deterministicEngine.js";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const PORT = Number(process.env.PORT ?? 3000);

  // 1. Initialize WebSocket Server for Real-Time Telemetry
  const wss = new WebSocketServer({ server: httpServer });

  wss.on("connection", (ws) => {
    logger.info("🔌 Live Diagnostic Client Connected");

    ws.on("message", async (message) => {
      try {
        const { type, payload } = JSON.parse(message.toString());

        if (type === "START_STREAMING_DIAGNOSTIC") {
          const { parsedSTIL, logMap } = payload;
          logger.info(`🚀 Starting Streaming Diagnostic for ${parsedSTIL.patternBurst}`);

          // Industrial Throtte: avoid saturated buffers
          let cycleBatch = [];
          const THROTTLE_SHUTTLE = 1000; 

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

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

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
    const errorBody = err as { status?: number; message?: string };
    logger.error("[CRITICAL SERVER ERROR]", err);
    res.status(errorBody.status || 500).json({ 
      error: "Industrial System Error", 
      message: process.env.NODE_ENV === 'production' ? "Internal server error" : errorBody.message 
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

startServer();
