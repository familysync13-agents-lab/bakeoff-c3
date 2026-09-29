import path from "node:path";

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

import * as schema from "./schema";
import { seed } from "./seed.server";

// Arbitrary constant key: serialises concurrent setups (e.g. two containers starting on one database).
const SETUP_LOCK_ID = 725_104_331;

export type SetupOptions = {
  connectionString: string;
  migrationsFolder?: string;
  /** How long to wait for the database to accept connections. */
  connectTimeoutMs?: number;
};

async function connect(connectionString: string, timeoutMs: number): Promise<pg.Client> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const client = new pg.Client({ connectionString });
    try {
      await client.connect();
      return client;
    } catch (error) {
      await client.end().catch(() => undefined);
      if (Date.now() >= deadline) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

/** Applies all pending migrations, then the seed. Both steps are idempotent. */
export async function setupDatabase(options: SetupOptions): Promise<void> {
  const client = await connect(options.connectionString, options.connectTimeoutMs ?? 60_000);
  try {
    await client.query("select pg_advisory_lock($1)", [SETUP_LOCK_ID]);
    const db = drizzle({ client, schema });
    await migrate(db, {
      migrationsFolder: options.migrationsFolder ?? path.resolve("drizzle"),
    });
    await seed(db);
    await client.query("select pg_advisory_unlock($1)", [SETUP_LOCK_ID]);
  } finally {
    await client.end();
  }
}
