import { verifyPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { countUsers } from "../app/db/queries.server";
import * as schema from "../app/db/schema";
import { SEED_USERS } from "../app/db/seed.server";
import { setupDatabase } from "../app/db/setup.server";

import { createTestDatabase } from "./support/database";

describe("database setup (migrations + seed)", () => {
  let testDb: Awaited<ReturnType<typeof createTestDatabase>>;
  let pool: pg.Pool;
  let db: ReturnType<typeof drizzle<typeof schema>>;

  beforeAll(async () => {
    testDb = await createTestDatabase();
    pool = new pg.Pool({ connectionString: testDb.url });
    db = drizzle({ client: pool, schema });
  });

  afterAll(async () => {
    await pool.end();
    await testDb.drop();
  });

  it("creates the schema and exactly the two seed users on an empty database", async () => {
    await setupDatabase({ connectionString: testDb.url });
    expect(await countUsers(db)).toBe(2);
    const emails = (await db.select({ email: schema.user.email }).from(schema.user)).map(
      (r) => r.email,
    );
    expect(emails.sort()).toEqual(["alice@example.test", "bob@example.test"]);
  });

  it("is idempotent: running it again (a restart) changes nothing", async () => {
    const before = await db.select().from(schema.account);
    await setupDatabase({ connectionString: testDb.url });
    await setupDatabase({ connectionString: testDb.url });
    expect(await countUsers(db)).toBe(2);
    expect(await db.select().from(schema.account)).toEqual(before);
  });

  it("serialises concurrent setups on the same database", async () => {
    await Promise.all([
      setupDatabase({ connectionString: testDb.url }),
      setupDatabase({ connectionString: testDb.url }),
    ]);
    expect(await countUsers(db)).toBe(2);
  });

  it("gives each seed user a Better Auth credential account with their password", async () => {
    for (const seedUser of SEED_USERS) {
      const [row] = await db
        .select({ name: schema.user.name, password: schema.account.password })
        .from(schema.user)
        .innerJoin(schema.account, eq(schema.account.userId, schema.user.id))
        .where(eq(schema.user.email, seedUser.email));
      expect(row?.name).toBe(seedUser.name);
      const hash = row?.password ?? "";
      expect(hash).not.toContain(seedUser.password);
      expect(await verifyPassword({ hash, password: seedUser.password })).toBe(true);
      expect(await verifyPassword({ hash, password: "wrong-password" })).toBe(false);
    }
    const providers = await db.select({ p: schema.account.providerId }).from(schema.account);
    expect(providers.every((r) => r.p === "credential")).toBe(true);
  });
});
