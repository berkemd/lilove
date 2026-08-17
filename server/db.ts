import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Lazy initialization to prevent crash at import time
// This allows the server to start and respond to health checks even if DATABASE_URL is missing
let _pool: Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

function getPool(): Pool {
  if (!_pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?",
      );
    }
    _pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return _pool;
}

function getDb(): ReturnType<typeof drizzle> {
  if (!_db) {
    _db = drizzle({ client: getPool(), schema });
  }
  return _db;
}

// Export proxies that lazily initialize on first use
export const pool = new Proxy({} as Pool, {
  get(_, prop) {
    return (getPool() as any)[prop];
  }
});

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_, prop) {
    return (getDb() as any)[prop];
  }
});
