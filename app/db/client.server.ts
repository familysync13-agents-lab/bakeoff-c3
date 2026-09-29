import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";

import { databaseUrl } from "../lib/config.server";

import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

let pool: pg.Pool | undefined;
let database: Database | undefined;

/** Process-wide connection pool, created on first use. */
export function getDb(): Database {
  if (!database) {
    pool = new pg.Pool({ connectionString: databaseUrl(), max: 10 });
    database = drizzle({ client: pool, schema });
  }
  return database;
}

export async function closeDb(): Promise<void> {
  const p = pool;
  pool = undefined;
  database = undefined;
  await p?.end();
}
