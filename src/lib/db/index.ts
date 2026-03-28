import Database from "better-sqlite3";
import { drizzle, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { sql } from "drizzle-orm";
import * as schema from "./schema";

let _db: BetterSQLite3Database<typeof schema> | null = null;

function getDb() {
  if (!_db) {
    const dbPath = process.env.DATABASE_URL?.replace("file:", "") || "./data/trace.db";
    const sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("busy_timeout = 5000");
    _db = drizzle(sqlite, { schema });

    ensureTables(_db);
  }
  return _db;
}

function ensureTables(db: BetterSQLite3Database<typeof schema>) {
  db.run(sql`CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    barcode TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    category TEXT NOT NULL,
    image_url TEXT,
    source TEXT DEFAULT 'internal',
    nutri_score TEXT,
    eco_score TEXT,
    ingredients TEXT,
    allergens TEXT DEFAULT '[]',
    off_data TEXT DEFAULT '{}',
    created_at TEXT NOT NULL
  )`);

  db.run(sql`CREATE TABLE IF NOT EXISTS batches (
    id TEXT PRIMARY KEY,
    lot_code TEXT NOT NULL UNIQUE,
    product_id TEXT NOT NULL REFERENCES products(id),
    status TEXT NOT NULL DEFAULT 'active',
    risk_score INTEGER NOT NULL DEFAULT 0,
    unit_count INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);

  db.run(sql`CREATE TABLE IF NOT EXISTS batch_lineage (
    id TEXT PRIMARY KEY,
    parent_batch_id TEXT NOT NULL REFERENCES batches(id),
    child_batch_id TEXT NOT NULL REFERENCES batches(id),
    relationship TEXT NOT NULL,
    ratio REAL,
    created_at TEXT NOT NULL
  )`);

  db.run(sql`CREATE TABLE IF NOT EXISTS batch_stages (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL REFERENCES batches(id),
    stage_type TEXT NOT NULL,
    name TEXT NOT NULL,
    location_name TEXT,
    latitude REAL,
    longitude REAL,
    route_coords TEXT,
    operator TEXT,
    metadata TEXT NOT NULL DEFAULT '{}',
    started_at TEXT NOT NULL,
    completed_at TEXT,
    sequence_order INTEGER NOT NULL,
    created_at TEXT NOT NULL
  )`);

  db.run(sql`CREATE TABLE IF NOT EXISTS telemetry_readings (
    id TEXT PRIMARY KEY,
    stage_id TEXT NOT NULL REFERENCES batch_stages(id),
    reading_type TEXT NOT NULL,
    value REAL NOT NULL,
    unit TEXT NOT NULL,
    recorded_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`);

  db.run(sql`CREATE TABLE IF NOT EXISTS stage_anomalies (
    id TEXT PRIMARY KEY,
    stage_id TEXT NOT NULL REFERENCES batch_stages(id),
    batch_id TEXT NOT NULL REFERENCES batches(id),
    anomaly_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    description TEXT NOT NULL,
    threshold_value REAL,
    actual_value REAL,
    duration_minutes INTEGER,
    risk_score_impact INTEGER NOT NULL DEFAULT 0,
    detected_at TEXT NOT NULL,
    resolved_at TEXT,
    created_at TEXT NOT NULL
  )`);

  db.run(sql`CREATE TABLE IF NOT EXISTS consumer_reports (
    id TEXT PRIMARY KEY,
    lot_code TEXT NOT NULL,
    batch_id TEXT REFERENCES batches(id),
    device_id TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    photo_url TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    created_at TEXT NOT NULL
  )`);

  db.run(sql`CREATE TABLE IF NOT EXISTS recalls (
    id TEXT PRIMARY KEY,
    reason TEXT NOT NULL,
    severity TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    triggered_by TEXT,
    affected_regions TEXT DEFAULT '[]',
    estimated_units INTEGER,
    created_at TEXT NOT NULL,
    ended_at TEXT
  )`);

  db.run(sql`CREATE TABLE IF NOT EXISTS recall_lots (
    recall_id TEXT NOT NULL REFERENCES recalls(id),
    batch_id TEXT NOT NULL REFERENCES batches(id),
    PRIMARY KEY (recall_id, batch_id)
  )`);

  db.run(sql`CREATE TABLE IF NOT EXISTS push_subscriptions (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    auth TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`);

  db.run(sql`CREATE TABLE IF NOT EXISTS device_scans (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    barcode TEXT NOT NULL,
    scanned_at TEXT NOT NULL,
    UNIQUE(device_id, barcode)
  )`);
}

export const db = new Proxy({} as BetterSQLite3Database<typeof schema>, {
  get(_, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export type DB = BetterSQLite3Database<typeof schema>;
