import { createPool } from "mysql2/promise";
import dotenv from "dotenv";
import { logger } from "../utils/logger.js";
dotenv.config();

export const db = createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "stil_diagnostics",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

/**
 * Industrial Schema Migration Engine: Self-Healing Layer
 * Ensures MySQL schema remains synchronized with backend evolutionary changes.
 */
async function ensureColumnExists(table: string, column: string, definition: string) {
  try {
    const [rows] = await db.query(`SHOW COLUMNS FROM ${table} LIKE ?`, [column]);
    if ((rows as unknown[]).length === 0) {
      logger.info(`[DATABASE] Auto-Sync: Migrating table "${table}"...`);
      await db.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      logger.info(`[DATABASE] Auto-Sync: Added missing column ${table}.${column} [${definition}]`);
    }
  } catch (error) {
    logger.warn(`[DATABASE] Auto-Sync Error: Failed to audit column ${table}.${column}:`, error);
  }
}

export async function initDB() {
  try {
    logger.info(`📡 Connecting to MySQL at ${process.env.DB_HOST || "127.0.0.1"} as user ${process.env.DB_USER || "root"}...`);
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD,
    });
    
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || "stil_diagnostics"};`);
    await connection.end();

    logger.info("[DATABASE] Synchronizing industrial schema...");

    // 1. Core Table Initialization
    await db.query(`
      CREATE TABLE IF NOT EXISTS upload_batches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        batch_name VARCHAR(255),
        upload_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        total_files INT,
        INDEX (upload_timestamp)
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS chips (
        id INT AUTO_INCREMENT PRIMARY KEY,
        batch_id INT,
        chip_id VARCHAR(100),
        status ENUM('PASS', 'FAIL'),
        mismatches INT,
        yield_percent FLOAT,
        total_scan_chains INT,
        total_flip_flops INT,
        total_patterns INT,
        first_fail_pattern VARCHAR(100),
        project_data JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX (batch_id),
        INDEX (chip_id),
        FOREIGN KEY (batch_id) REFERENCES upload_batches(id) ON DELETE CASCADE
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS failed_chains (
        id INT AUTO_INCREMENT PRIMARY KEY,
        chip_id INT,
        chain_name VARCHAR(100),
        mismatch_count INT,
        INDEX (chip_id),
        FOREIGN KEY (chip_id) REFERENCES chips(id) ON DELETE CASCADE
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS failure_details (
        id INT AUTO_INCREMENT PRIMARY KEY,
        chip_id INT,
        pattern_id VARCHAR(100),
        chain_name VARCHAR(100),
        flip_flop_position INT,
        expected_value CHAR(1),
        actual_value CHAR(1),
        mismatch_type VARCHAR(50),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX (chip_id),
        FOREIGN KEY (chip_id) REFERENCES chips(id) ON DELETE CASCADE
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS analytics_cache (
        id INT AUTO_INCREMENT PRIMARY KEY,
        batch_id INT,
        avg_yield FLOAT,
        top_failing_chain VARCHAR(100),
        top_failing_pattern VARCHAR(100),
        hotspot_summary JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX (batch_id),
        FOREIGN KEY (batch_id) REFERENCES upload_batches(id) ON DELETE CASCADE
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS ai_insights (
        id INT AUTO_INCREMENT PRIMARY KEY,
        chip_id INT,
        failure_hash VARCHAR(255),
        insight TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX (chip_id),
        INDEX (failure_hash),
        FOREIGN KEY (chip_id) REFERENCES chips(id) ON DELETE CASCADE
      );
    `);

    // 2. Self-Healing Schema Migration Layer: Audit Critical Columns
    logger.info("[DATABASE] Running Auto-Sync audit...");
    
    // Chips Table Audit
    await ensureColumnExists("chips", "project_data", "JSON NULL AFTER first_fail_pattern");
    await ensureColumnExists("chips", "batch_id", "INT AFTER id");
    await ensureColumnExists("chips", "first_fail_pattern", "VARCHAR(100) AFTER total_patterns");

    // Failure Details Table Audit
    await ensureColumnExists("failure_details", "expected_value", "CHAR(1) AFTER flip_flop_position");
    await ensureColumnExists("failure_details", "actual_value", "CHAR(1) AFTER expected_value");
    await ensureColumnExists("failure_details", "fault_type", "VARCHAR(50) AFTER mismatch_type");

    // Analytics Cache Table Audit
    await ensureColumnExists("analytics_cache", "hotspot_summary", "JSON AFTER top_failing_pattern");

    logger.info("[DATABASE] Industrial schema synchronized successfully.");
    logger.info("📡 Connected to MySQL successfully.");
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      logger.error("\n❌ Database Access Denied!");
      logger.error("--------------------------------------------------");
      logger.error(`Status: ${err.message}`);
      logger.error(`Attempted Connection: user "${process.env.DB_USER || "root"}" at ${process.env.DB_HOST || "127.0.0.1"}`);
      logger.error("\nPlease ensure your .env file has the CORRECT password for your local MySQL.");
      logger.error("If you don't have a password, leave DB_PASSWORD blank in .env.");
      logger.error("--------------------------------------------------\n");
    } else {
      logger.error("Database initialization failed:", error);
    }
  }
}
