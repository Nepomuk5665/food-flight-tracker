import Database from "better-sqlite3";
import { drizzle, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

let _db: BetterSQLite3Database<typeof schema> | null = null;

function getDb() {
  if (!_db) {
    const sqlite = new Database(process.env.DATABASE_URL?.replace("file:", "") || "./data/trace.db");
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("busy_timeout = 5000");
    _db = drizzle(sqlite, { schema });
  }
  return _db;
}

export const db = new Proxy({} as BetterSQLite3Database<typeof schema>, {
  get(_, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export type DB = BetterSQLite3Database<typeof schema>;
