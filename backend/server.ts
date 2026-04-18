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

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT ?? 3000);

  // 1. Initialize Database Self-Healing Layer
  await initDB();

  // 2. Critical Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Ensure uploads directory exists for industrial ingestion
  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // 3. Modular API Surface Mounting (Zero-Logic Entry Point)
  app.use("/api/uploads", uploadRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/data", chipRoutes); 
  app.use("/api/ai", aiRoutes);

  // 4. Serve Frontend in Production / Vite Middleware in Dev
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    console.log("🛠️  Development Mode: API Server only. Frontend should run via 'npm run dev'");
    app.get('/', (req, res) => {
      res.send("STIL Analyzer API is running. Access the frontend via Vite dev server.");
    });
  }

  // 5. Global Error Handling (Industrial Grade)
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error("[CRITICAL SERVER ERROR]", err);
    res.status(err.status || 500).json({ 
      error: "Industrial System Error", 
      message: process.env.NODE_ENV === 'production' ? "Internal server error" : err.message 
    });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`
🚀 INDUSTRIAL DIAGNOSTIC CORE ACTIVE
--------------------------------------------------
PORT: ${PORT}
DB STATUS: CONNECTED & SYNCHRONIZED
LOGIC LAYER: MODULAR & DECOUPLED
ENV: ${process.env.NODE_ENV || 'development'}
--------------------------------------------------
    `);
  });
}

startServer().catch(err => {
  console.error("FATAL: System failed to boot:", err);
  process.exit(1);
});
