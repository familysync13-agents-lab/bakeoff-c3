import { renderToString } from "react-dom/server";
import { createRoutesStub } from "react-router";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { closeDb } from "../app/db/client.server";
import { setupDatabase } from "../app/db/setup.server";
import { resetAuth } from "../app/lib/auth.server";
import { createShareToken, verifyShareToken } from "../app/lib/share-link.server";
import { action as loginAction } from "../app/routes/login";
import { action as newAction } from "../app/routes/lists.new";
import ShowList, { action as showAction, loader as showLoader } from "../app/routes/lists.show";
import SharedList, { loader as shareLoader } from "../app/routes/share";

import { createTestDatabase } from "./support/database";
import { Browser, ORIGIN, run } from "./support/http";

const KEY = "test-share-key";
const LIST = "0f8fad5b-d9cb-469f-a165-70867728950e";
const NOW = 1_800_000_000_000;

describe("share tokens", () => {
  const token = createShareToken(LIST, NOW / 1000 + 60, KEY);

  it("verify for the bound list until the bound expiry time", () => {
    expect(verifyShareToken(token, NOW, KEY)).toEqual({
      ok: true,
      listId: LIST,
      expiresAt: NOW / 1000 + 60,
    });
    expect(verifyShareToken(token, NOW + 59_999, KEY).ok).toBe(true);
    expect(verifyShareToken(token, NOW + 60_000, KEY)).toEqual({ ok: false, reason: "expired" });
  });

  it("are refused when any character is changed, or when truncated or extended", () => {
    const variants = [...token].map(
      (c, i) => token.slice(0, i) + (c === "A" ? "B" : "A") + token.slice(i + 1),
    );
    // Also the neighbouring base64url letters (non-canonical trailing bits must not be accepted).
    for (const c of ["B", "C", "D", "E", "F", "a", "0", "-", "_"])
      variants.push(token.slice(0, -1) + c);
    variants.push(token.slice(0, -1), token + "A", `${token}.`, "", token.slice(1));
    for (const variant of variants.filter((v) => v !== token)) {
      expect(verifyShareToken(variant, NOW, KEY), variant).toEqual({
        ok: false,
        reason: "invalid",
      });
    }
  });

  it("are refused with another key or a moved expiry, and differ per list", () => {
    expect(verifyShareToken(token, NOW, "other-key").ok).toBe(false);
    const [id, , sig] = token.split(".");
    expect(verifyShareToken(`${id}.${NOW / 1000 + 9999}.${sig}`, NOW, KEY).ok).toBe(false);
    const other = createShareToken("1f8fad5b-d9cb-469f-a165-70867728950e", NOW / 1000 + 60, KEY);
    expect(other.split(".")[2]).not.toBe(sig);
  });

  it("never contain the key", () => {
    const secret = "AGENTSAPP-CANARY-share";
    expect(createShareToken(LIST, 1, secret)).not.toContain(secret);
  });
});

describe("share links end to end", () => {
  let testDb: Awaited<ReturnType<typeof createTestDatabase>>;
  let alice: Browser;
  const saved = { DATABASE_URL: process.env.DATABASE_URL, APP_URL: process.env.APP_URL };

  async function signIn(email: string, password: string): Promise<Browser> {
    const browser = new Browser();
    const res = await run(loginAction, browser.post("/login", { email, password }));
    browser.receive(res.response!);
    return browser;
  }

  async function createList(name: string): Promise<string> {
    const res = await run(newAction, alice.post("/lists/new", { name }));
    return /^\/lists\/([^/]+)$/.exec(res.location ?? "")![1]!;
  }

  async function share(browser: Browser, id: string, expires = "7d") {
    return run(showAction, browser.post(`/lists/${id}`, { intent: "share", expires }), { id });
  }

  const tokenOf = (url: string) => new URL(url).pathname.replace(/^\/s\//, "");
  const open = (token: string) => run(shareLoader, new Browser().get(`/s/${token}`), { token });

  beforeAll(async () => {
    testDb = await createTestDatabase();
    await setupDatabase({ connectionString: testDb.url });
    process.env.DATABASE_URL = testDb.url;
    process.env.APP_URL = `${ORIGIN}/`;
    await closeDb();
    resetAuth();
    alice = await signIn("alice@example.test", "Correct-Horse-1");
  });

  afterAll(async () => {
    await closeDb();
    resetAuth();
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await testDb.drop();
  });

  it("the owner gets an absolute APP_URL link; anyone sees that list and its books", async () => {
    const id = await createList("Shared sci-fi");
    await run(
      showAction,
      alice.post(`/lists/${id}`, {
        intent: "add",
        key: "/works/OL893415W",
        title: "Dune",
        author: "Frank Herbert",
      }),
      { id },
    );
    const otherId = await createList("Private other");
    const res = await share(alice, id);
    const url = (res.data as { shareUrl: string }).shareUrl;
    expect(url).toMatch(new RegExp(`^${ORIGIN}/s/[^/]+$`));
    const page = await open(tokenOf(url));
    expect(page.status).toBe(200);
    expect(page.data).toEqual({
      list: { name: "Shared sci-fi" },
      books: [expect.objectContaining({ title: "Dune", authors: "Frank Herbert" })],
    });
    const other = await share(alice, otherId);
    const otherPage = await open(tokenOf((other.data as { shareUrl: string }).shareUrl));
    expect(otherPage.data).toEqual({ list: { name: "Private other" }, books: [] });
  });

  it("only the owner can create links; unknown expiry choices are refused", async () => {
    const id = await createList("Owner only");
    const bob = await signIn("bob@example.test", "Battery-Staple-2");
    expect((await share(bob, id)).status).toBe(404);
    expect((await share(new Browser(), id)).location).toBe("/login");
    expect((await share(alice, id, "forever")).status).toBe(400);
  });

  it("1-minute links expire (410); tampered links answer 404", async () => {
    const id = await createList("Short-lived");
    const url = (await share(alice, id, "1m")).data as { shareUrl: string };
    const token = tokenOf(url.shareUrl);
    const expiresAt = Number(token.split(".")[1]);
    expect(expiresAt - Date.now() / 1000).toBeGreaterThan(55);
    expect(expiresAt - Date.now() / 1000).toBeLessThanOrEqual(60);
    expect((await open(token)).status).toBe(200);
    expect(verifyShareToken(token, (expiresAt + 10) * 1000)).toEqual({
      ok: false,
      reason: "expired",
    });
    const expired = createShareToken(id, Math.floor(Date.now() / 1000) - 1);
    expect((await open(expired)).status).toBe(410);
    expect((await open(`${token}A`)).status).toBe(404);
    expect((await open(token.slice(0, -1))).status).toBe(404);
  });

  it("links of a deleted list answer 404", async () => {
    const id = await createList("Soon deleted");
    const token = tokenOf(((await share(alice, id)).data as { shareUrl: string }).shareUrl);
    await run(showAction, alice.post(`/lists/${id}`, { intent: "delete" }), { id });
    const res = await open(token);
    expect(res.status).toBe(404);
    expect(JSON.stringify(res.data ?? "")).not.toContain("Soon deleted");
  });

  it("the owner page still loads after sharing", async () => {
    const id = await createList("Still mine");
    await share(alice, id);
    const page = await run(showLoader, alice.get(`/lists/${id}`), { id });
    expect(page.status).toBe(200);
  });
});

describe("share rendering", () => {
  it("the list page has the expiry select, the button and, after creation, a read-only link", () => {
    const Stub = createRoutesStub([
      {
        id: "page",
        path: "/lists/:id",
        Component: ShowList as never,
        action: () => ({ shareUrl: `${ORIGIN}/s/abc` }),
      },
    ]);
    const html = renderToString(
      <Stub
        initialEntries={["/lists/abc"]}
        hydrationData={{
          loaderData: {
            page: { list: { id: "abc", name: "W" }, books: [], query: "", search: null },
          },
          actionData: { page: { shareUrl: `${ORIGIN}/s/abc` } },
        }}
      />,
    );
    expect(html).toMatch(/<label for="([^"]+)-expires"[^>]*>Link expires in<\/label>/);
    expect(html).toMatch(
      /<option value="1m">1 minute<\/option><option value="1d">1 day<\/option><option value="7d" selected="">7 days<\/option>/,
    );
    expect(html).toMatch(/<button type="submit"[^>]*>Create share link<\/button>/);
    expect(html).toMatch(/<label for="[^"]+-url"[^>]*>Share link<\/label>/);
    expect(html).toMatch(new RegExp(`<input [^>]*readOnly=""[^>]*value="${ORIGIN}/s/abc"`));
  });

  it("the share page shows the name and books, and no controls", () => {
    const Stub = createRoutesStub([
      { id: "share", path: "/s/:token", Component: SharedList as never },
    ]);
    const html = renderToString(
      <Stub
        initialEntries={["/s/t"]}
        hydrationData={{
          loaderData: {
            share: {
              list: { name: "Weekend" },
              books: [{ id: "1", title: "Dune", authors: "Frank Herbert", year: 1965 }],
            },
          },
        }}
      />,
    );
    expect(html).toMatch(/<h1[^>]*>Weekend<\/h1>/);
    expect(html).toContain("Dune");
    expect(html).toContain("Frank Herbert");
    expect(html).not.toMatch(/<(form|button|input|select|a)\b/);
  });
});
