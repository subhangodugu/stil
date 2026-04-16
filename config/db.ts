import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

export const db = mysql.createPool({
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
    if ((rows as any[]).length === 0) {
      console.log(`[DATABASE] Auto-Sync: Migrating table "${table}"...`);
      await db.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      console.log(`[DATABASE] Auto-Sync: Added missing column ${table}.${column} [${definition}]`);
    }
  } catch (error) {
    console.warn(`[DATABASE] Auto-Sync Error: Failed to audit column ${table}.${column}:`, error);
  }
}

export async function initDB() {
  try {
    console.log(`📡 Connecting to MySQL at ${process.env.DB_HOST || "127.0.0.1"} as user ${process.env.DB_USER || "root"}...`);
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD,
    });
    
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || "stil_diagnostics"};`);
    await connection.end();

    console.log("[DATABASE] Synchronizing industrial schema...");

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

    // 2. Self-Healing Schema Migration Layer: Audit Critical Columns
    console.log("[DATABASE] Running Auto-Sync audit...");
    
    // Chips Table Audit
    await ensureColumnExists("chips", "project_data", "JSON NULL AFTER first_fail_pattern");
    await ensureColumnExists("chips", "batch_id", "INT AFTER id");
    await ensureColumnExists("chips", "first_fail_pattern", "VARCHAR(100) AFTER total_patterns");

    // Failure Details Table Audit
    await ensureColumnExists("failure_details", "expected_value", "CHAR(1) AFTER flip_flop_position");
    await ensureColumnExists("failure_details", "actual_value", "CHAR(1) AFTER expected_value");

    // Analytics Cache Table Audit
    await ensureColumnExists("analytics_cache", "hotspot_summary", "JSON AFTER top_failing_pattern");

    console.log("[DATABASE] Industrial schema synchronized successfully.");
    console.log("📡 Connected to MySQL successfully.");
  } catch (error: any) {
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error("\n❌ Database Access Denied!");
      console.error("--------------------------------------------------");
      console.error(`Status: ${error.message}`);
      console.error(`Attempted Connection: user "${process.env.DB_USER || "root"}" at ${process.env.DB_HOST || "127.0.0.1"}`);
      console.error("\nPlease ensure your .env file has the CORRECT password for your local MySQL.");
      console.error("If you don't have a password, leave DB_PASSWORD blank in .env.");
      console.error("--------------------------------------------------\n");
    } else {
      console.error("Database initialization failed:", error);
    }
  }
}
