import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { closeDb, getDb } from "../app/db/client.server";
import { readingList, user } from "../app/db/schema";
import { setupDatabase } from "../app/db/setup.server";
import { resetAuth } from "../app/lib/auth.server";
import { loader as rootLoader } from "../app/root";
import { action as loginAction } from "../app/routes/login";
import { action as logoutAction } from "../app/routes/logout";
import { loader as listsLoader } from "../app/routes/lists";
import { action as editAction, loader as editLoader } from "../app/routes/lists.edit";
import { action as newAction, loader as newLoader } from "../app/routes/lists.new";
import { action as showAction, loader as showLoader } from "../app/routes/lists.show";
import { action as signupAction } from "../app/routes/signup";

import { createTestDatabase } from "./support/database";
import { Browser, ORIGIN, run } from "./support/http";

const ALICE = { email: "alice@example.test", password: "Correct-Horse-1" };
const BOB = { email: "bob@example.test", password: "Battery-Staple-2" };

async function signIn(credentials: { email: string; password: string }): Promise<Browser> {
  const browser = new Browser();
  const res = await run(loginAction, browser.post("/login", credentials));
  expect(res).toMatchObject({ status: 302, location: "/lists" });
  browser.receive(res.response!);
  return browser;
}

async function createList(browser: Browser, name: string): Promise<string> {
  const res = await run(newAction, browser.post("/lists/new", { name }));
  expect(res.status).toBe(302);
  const match = /^\/lists\/([^/]+)$/.exec(res.location ?? "");
  expect(match).not.toBeNull();
  return match![1]!;
}

async function storedName(id: string): Promise<string | undefined> {
  const [row] = await getDb()
    .select({ name: readingList.name })
    .from(readingList)
    .where(eq(readingList.id, id));
  return row?.name;
}

async function shownLists(browser: Browser) {
  const res = await run(listsLoader, browser.get("/lists"));
  expect(res.status).toBe(200);
  return (res.data as { lists: { id: string; name: string }[] }).lists;
}

describe("authentication and reading lists", () => {
  let testDb: Awaited<ReturnType<typeof createTestDatabase>>;
  const saved = { DATABASE_URL: process.env.DATABASE_URL, APP_URL: process.env.APP_URL };

  beforeAll(async () => {
    testDb = await createTestDatabase();
    await setupDatabase({ connectionString: testDb.url });
    process.env.DATABASE_URL = testDb.url;
    process.env.APP_URL = ORIGIN;
    await closeDb();
    resetAuth();
  });

  afterAll(async () => {
    await closeDb();
    resetAuth();
    Object.assign(process.env, saved);
    await testDb.drop();
  });

  describe("sign-up (AC1)", () => {
    it("creates the account, signs the visitor in and redirects to /lists", async () => {
      const browser = new Browser();
      const res = await run(
        signupAction,
        browser.post("/signup", {
          name: "Carol",
          email: "carol@example.test",
          password: "12345678",
        }),
      );
      expect(res).toMatchObject({ status: 302, location: "/lists" });
      browser.receive(res.response!);
      expect((await run(listsLoader, browser.get("/lists"))).status).toBe(200);
      const root = await run(rootLoader, browser.get("/lists"));
      expect(root.data).toMatchObject({ user: { name: "Carol" } });
      const stored = await getDb().select().from(user).where(eq(user.email, "carol@example.test"));
      expect(stored).toHaveLength(1);
    });

    it.each([
      [{ name: "", email: "dan@example.test", password: "12345678" }, /name/],
      [{ name: "Dan", email: "not-an-email", password: "12345678" }, /email/],
      [{ name: "Dan", email: "dan@example.test", password: "1234567" }, /password/],
      [{ name: "Dup", email: "alice@example.test", password: "12345678" }, /already exists/],
    ])("re-displays the form with the problem for invalid input %#", async (fields, message) => {
      const res = await run(signupAction, new Browser().post("/signup", fields));
      expect(res.status).toBe(400);
      const errors = (res.data as { errors: Record<string, string> }).errors;
      expect(Object.values(errors).join(" ")).toMatch(message);
      expect(res.response).toBeUndefined();
    });
  });

  describe("sign-in and sign-out (AC2, AC3)", () => {
    it("signs the seeded user in with the correct password", async () => {
      const alice = await signIn(ALICE);
      expect(alice.cookieHeader).toMatch(/session_token=/);
      const root = await run(rootLoader, alice.get("/"));
      expect(root.data).toMatchObject({ user: { name: "Alice" } });
    });

    it("refuses a wrong password with an Invalid message and no session", async () => {
      const browser = new Browser();
      const res = await run(
        loginAction,
        browser.post("/login", { email: ALICE.email, password: "wrong-password" }),
      );
      expect(res.status).toBe(401);
      expect((res.data as { error: string }).error).toContain("Invalid");
      expect(res.response).toBeUndefined();
      expect((await run(listsLoader, browser.get("/lists"))).location).toBe("/login");
    });

    it("signs out to / and the old session no longer gives access", async () => {
      const alice = await signIn(ALICE);
      const oldCookie = alice.cookieHeader;
      const res = await run(logoutAction, alice.post("/logout", {}));
      expect(res).toMatchObject({ status: 302, location: "/" });
      alice.receive(res.response!);
      expect((await run(listsLoader, alice.get("/lists"))).location).toBe("/login");
      // Even a replayed copy of the old cookie is dead (the session was deleted server-side).
      const replay = new Request(`${ORIGIN}/lists`, { headers: { cookie: oldCookie } });
      expect((await run(listsLoader, replay)).location).toBe("/login");
    });

    it("refuses cross-site form posts", async () => {
      const req = new Request(`${ORIGIN}/login`, {
        method: "POST",
        headers: { origin: "https://evil.example" },
        body: new URLSearchParams(ALICE),
      });
      expect((await run(loginAction, req)).status).toBe(403);
    });
  });

  describe("reading-list CRUD (AC4-AC7)", () => {
    it("creates a list, shows it and lists it for the owner", async () => {
      const alice = await signIn(ALICE);
      expect((await run(newLoader, alice.get("/lists/new"))).status).toBe(200);
      const id = await createList(alice, "  Summer reads  ");
      const shown = await run(showLoader, alice.get(`/lists/${id}`), { id });
      expect(shown.data).toMatchObject({ list: { id, name: "Summer reads" } });
      expect(await shownLists(alice)).toContainEqual({ id, name: "Summer reads" });
    });

    it("validates the name: empty or over 100 characters is refused, exactly 100 accepted", async () => {
      const alice = await signIn(ALICE);
      const before = (await shownLists(alice)).length;
      for (const name of ["", "   ", "x".repeat(101)]) {
        const res = await run(newAction, alice.post("/lists/new", { name }));
        expect(res.status).toBe(400);
        expect((res.data as { error: string }).error).toMatch(/name/);
      }
      expect(await shownLists(alice)).toHaveLength(before);
      const id = await createList(alice, "y".repeat(100));
      expect(await storedName(id)).toBe("y".repeat(100));

      const edit = await run(
        editAction,
        alice.post(`/lists/${id}/edit`, { name: "z".repeat(101) }),
        {
          id,
        },
      );
      expect(edit.status).toBe(400);
      expect((edit.data as { error: string }).error).toMatch(/name/);
      const empty = await run(editAction, alice.post(`/lists/${id}/edit`, { name: "" }), { id });
      expect(empty.status).toBe(400);
      expect(await storedName(id)).toBe("y".repeat(100));
    });

    it("renames a list; the new name persists across sessions", async () => {
      const alice = await signIn(ALICE);
      const id = await createList(alice, "Old name");
      const form = await run(editLoader, alice.get(`/lists/${id}/edit`), { id });
      expect(form.data).toEqual({ list: { id, name: "Old name" } });
      const res = await run(editAction, alice.post(`/lists/${id}/edit`, { name: "New name" }), {
        id,
      });
      expect(res).toMatchObject({ status: 302, location: `/lists/${id}` });
      const again = await signIn(ALICE);
      const shown = await run(showLoader, again.get(`/lists/${id}`), { id });
      expect(shown.data).toMatchObject({ list: { id, name: "New name" } });
    });

    it("deletes a list permanently: 404 afterwards, also for the owner", async () => {
      const alice = await signIn(ALICE);
      const id = await createList(alice, "Doomed");
      const res = await run(showAction, alice.post(`/lists/${id}`, { intent: "delete" }), { id });
      expect(res).toMatchObject({ status: 302, location: "/lists" });
      expect((await shownLists(alice)).map((l) => l.id)).not.toContain(id);
      expect((await run(showLoader, alice.get(`/lists/${id}`), { id })).status).toBe(404);
      expect((await run(editLoader, alice.get(`/lists/${id}/edit`), { id })).status).toBe(404);
      expect(await storedName(id)).toBeUndefined();
    });
  });

  describe("ownership (AC8-AC10)", () => {
    let aliceId: string;
    let alice: Browser;

    beforeAll(async () => {
      alice = await signIn(ALICE);
      aliceId = await createList(alice, "Alice private list");
    });

    it("anonymous visitors are sent to /login for every list page", async () => {
      const anon = new Browser();
      const params = { id: aliceId };
      expect((await run(listsLoader, anon.get("/lists"))).location).toBe("/login");
      expect((await run(newLoader, anon.get("/lists/new"))).location).toBe("/login");
      expect((await run(showLoader, anon.get(`/lists/${aliceId}`), params)).location).toBe(
        "/login",
      );
      expect((await run(editLoader, anon.get(`/lists/${aliceId}/edit`), params)).location).toBe(
        "/login",
      );
      expect((await run(newAction, anon.post("/lists/new", { name: "x" }))).location).toBe(
        "/login",
      );
    });

    it("another user neither sees nor opens the list (404)", async () => {
      const bob = await signIn(BOB);
      const params = { id: aliceId };
      expect((await shownLists(bob)).map((l) => l.id)).not.toContain(aliceId);
      expect((await run(showLoader, bob.get(`/lists/${aliceId}`), params)).status).toBe(404);
      expect((await run(editLoader, bob.get(`/lists/${aliceId}/edit`), params)).status).toBe(404);
    });

    it("replayed rename and delete requests from bob or anonymous change nothing", async () => {
      const bob = await signIn(BOB);
      const params = { id: aliceId };
      for (const browser of [bob, new Browser()]) {
        const rename = await run(
          editAction,
          browser.post(`/lists/${aliceId}/edit`, { name: "Hacked" }),
          params,
        );
        expect([302, 404]).toContain(rename.status);
        if (rename.status === 302) expect(rename.location).toBe("/login");
        const del = await run(
          showAction,
          browser.post(`/lists/${aliceId}`, { intent: "delete" }),
          params,
        );
        expect([302, 404]).toContain(del.status);
        if (del.status === 302) expect(del.location).toBe("/login");
      }
      const shown = await run(showLoader, alice.get(`/lists/${aliceId}`), params);
      expect(shown.data).toMatchObject({ list: { id: aliceId, name: "Alice private list" } });
    });
  });
});
