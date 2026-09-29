// Container start-up step: migrations + seed, before the HTTP server starts (see Dockerfile / npm start).
import { setupDatabase } from "../app/db/setup.server";
import { databaseUrl } from "../app/lib/config.server";

const started = Date.now();
try {
  await setupDatabase({ connectionString: databaseUrl() });
  console.log(`[setup] migrations and seed applied in ${Date.now() - started} ms`);
} catch (error) {
  console.error("[setup] failed:", error instanceof Error ? error.message : error);
  process.exit(1);
}
