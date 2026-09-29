import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { closeDb } from "../app/db/client.server";
import { setupDatabase } from "../app/db/setup.server";
import { loader } from "../app/routes/healthz";

import { createTestDatabase } from "./support/database";

describe("GET /healthz", () => {
  let testDb: Awaited<ReturnType<typeof createTestDatabase>>;
  const saved = { DATABASE_URL: process.env.DATABASE_URL, APP_ENV: process.env.APP_ENV };

  beforeAll(async () => {
    testDb = await createTestDatabase();
    await setupDatabase({ connectionString: testDb.url });
    process.env.DATABASE_URL = testDb.url;
    process.env.APP_ENV = "preview";
  });

  afterAll(async () => {
    await closeDb();
    Object.assign(process.env, saved);
    await testDb.drop();
  });

  it("answers 200 JSON with status, APP_ENV and the number of user accounts", async () => {
    const res = await loader();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/^application\/json/);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ status: "ok", env: "preview", users: 2 });
  });
});
