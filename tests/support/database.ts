import { randomBytes } from "node:crypto";

import pg from "pg";

/**
 * Integration tests run against DATABASE_URL (in the Dockerfile `check` stage: an empty test database). Each test
 * file creates its own throw-away database on that server so tests never touch existing data; if the role may not
 * create databases, the (empty) DATABASE_URL database itself is used.
 */
export async function createTestDatabase(): Promise<{ url: string; drop: () => Promise<void> }> {
  const baseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  if (!baseUrl) {
    throw new Error("Set DATABASE_URL (or TEST_DATABASE_URL) to run the integration tests");
  }
  const name = `srl_test_${randomBytes(6).toString("hex")}`;
  const admin = new pg.Client({ connectionString: baseUrl });
  await admin.connect();
  try {
    await admin.query(`create database ${name}`);
  } catch {
    return { url: baseUrl, drop: async () => undefined };
  } finally {
    await admin.end();
  }
  const url = new URL(baseUrl);
  url.pathname = `/${name}`;
  return {
    url: url.toString(),
    drop: async () => {
      const c = new pg.Client({ connectionString: baseUrl });
      await c.connect();
      try {
        await c.query(`drop database if exists ${name} with (force)`);
      } finally {
        await c.end();
      }
    },
  };
}
