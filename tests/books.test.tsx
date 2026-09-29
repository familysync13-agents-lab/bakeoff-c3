import { eq } from "drizzle-orm";
import { renderToString } from "react-dom/server";
import { createRoutesStub } from "react-router";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { closeDb, getDb } from "../app/db/client.server";
import { listBook } from "../app/db/schema";
import { setupDatabase } from "../app/db/setup.server";
import { resetAuth } from "../app/lib/auth.server";
import {
  BOOK_SEARCH_TIMEOUT_MS,
  parseSearchResponse,
  searchBooks,
} from "../app/lib/book-search.server";
import { parseAddBookForm } from "../app/lib/books";
import { action as loginAction } from "../app/routes/login";
import { action as newAction } from "../app/routes/lists.new";
import ShowList, { action as showAction, loader as showLoader } from "../app/routes/lists.show";

import { startBookApi } from "./support/books";
import { createTestDatabase } from "./support/database";
import { Browser, ORIGIN, run } from "./support/http";

const ALICE = { email: "alice@example.test", password: "Correct-Horse-1" };
const BOB = { email: "bob@example.test", password: "Battery-Staple-2" };

type LoaderData = Awaited<ReturnType<typeof showLoader>>;

describe("book search client", () => {
  let api: Awaited<ReturnType<typeof startBookApi>>;
  beforeAll(async () => {
    api = await startBookApi();
  });
  afterAll(() => api.close());

  it("maps API docs in order to title, authors and first publish year", async () => {
    const outcome = await searchBooks("dune", { baseUrl: api.url });
    expect(outcome).toEqual({
      ok: true,
      books: [
        { key: "/works/OL893415W", title: "Dune", authors: ["Frank Herbert"], year: 1965 },
        { key: "/works/OL893526W", title: "Dune Messiah", authors: ["Frank Herbert"], year: 1969 },
        {
          key: "/works/OL16808977W",
          title: "Dune: House Atreides",
          authors: ["Brian Herbert", "Kevin J. Anderson"],
          year: 1999,
        },
      ],
    });
    const request = api.requests.at(-1)!;
    expect(request.pathname).toBe("/search.json");
    expect(request.searchParams.get("q")).toBe("dune");
    expect(request.searchParams.get("limit")).toBe("10");
  });

  it("returns an empty result for no matches", async () => {
    expect(await searchBooks("zzzz-nothing", { baseUrl: api.url })).toEqual({
      ok: true,
      books: [],
    });
  });

  it("keeps at most 10 results and tolerates missing fields", async () => {
    const many = await searchBooks("many", { baseUrl: api.url });
    expect(many.ok && many.books.map((b) => b.title)).toEqual(
      Array.from({ length: 10 }, (_, i) => `Book ${i}`),
    );
    const sparse = await searchBooks("sparse", { baseUrl: api.url });
    expect(sparse).toMatchObject({
      ok: true,
      books: [{ title: "Untitled", authors: [], year: null }],
    });
  });

  it.each(["__error__", "__malformed__", "__nodocs__"])("reports %s as unavailable", async (q) => {
    expect(await searchBooks(q, { baseUrl: api.url })).toEqual({ ok: false });
  });

  it("gives up on an API that never answers", async () => {
    const started = Date.now();
    expect(await searchBooks("__timeout__", { baseUrl: api.url, timeoutMs: 300 })).toEqual({
      ok: false,
    });
    expect(Date.now() - started).toBeLessThan(2000);
    expect(BOOK_SEARCH_TIMEOUT_MS).toBeLessThanOrEqual(5000);
  });

  it("reports an unreachable API as unavailable", async () => {
    expect(await searchBooks("dune", { baseUrl: "http://127.0.0.1:1" })).toEqual({ ok: false });
  });

  it("parses only bodies with a docs array", () => {
    expect(parseSearchResponse(null)).toBeNull();
    expect(parseSearchResponse({ docs: "x" })).toBeNull();
    expect(parseSearchResponse({ docs: [1, { title: "A", key: "/works/A" }] })).toEqual([
      { key: "/works/A", title: "A", authors: [], year: null },
    ]);
  });
});

describe("add-book form parsing", () => {
  const form = (entries: [string, string][]) => {
    const f = new FormData();
    for (const [k, v] of entries) f.append(k, v);
    return f;
  };

  it("accepts key, title, several authors and a year", () => {
    expect(
      parseAddBookForm(
        form([
          ["key", "/works/X"],
          ["title", " X "],
          ["author", "A"],
          ["author", "B"],
          ["year", "1999"],
        ]),
      ),
    ).toEqual({ key: "/works/X", title: "X", authors: "A, B", year: 1999 });
  });

  it("refuses missing or oversized fields", () => {
    expect(parseAddBookForm(form([["title", "X"]]))).toBeNull();
    expect(parseAddBookForm(form([["key", "k"]]))).toBeNull();
    expect(
      parseAddBookForm(
        form([
          ["key", "k"],
          ["title", "x".repeat(501)],
        ]),
      ),
    ).toBeNull();
    expect(
      parseAddBookForm(
        form([
          ["key", "k"],
          ["title", "X"],
          ["year", "soon"],
        ]),
      ),
    ).toBeNull();
  });
});

describe("book search and books on the list page", () => {
  let testDb: Awaited<ReturnType<typeof createTestDatabase>>;
  let api: Awaited<ReturnType<typeof startBookApi>>;
  let alice: Browser;
  let listId: string;
  const saved = {
    DATABASE_URL: process.env.DATABASE_URL,
    APP_URL: process.env.APP_URL,
    BOOK_API_BASE_URL: process.env.BOOK_API_BASE_URL,
  };

  async function signIn(credentials: { email: string; password: string }): Promise<Browser> {
    const browser = new Browser();
    const res = await run(loginAction, browser.post("/login", credentials));
    expect(res.status).toBe(302);
    browser.receive(res.response!);
    return browser;
  }

  const show = async (browser: Browser, query = "") =>
    run(showLoader, browser.get(`/lists/${listId}${query}`), { id: listId });

  const addDune = (browser: Browser, id = listId) =>
    run(
      showAction,
      browser.post(`/lists/${id}?q=dune`, {
        intent: "add",
        key: "/works/OL893415W",
        title: "Dune",
        author: "Frank Herbert",
        year: "1965",
      }),
      { id },
    );

  const storedBooks = () => getDb().select().from(listBook).where(eq(listBook.listId, listId));

  beforeAll(async () => {
    testDb = await createTestDatabase();
    await setupDatabase({ connectionString: testDb.url });
    api = await startBookApi();
    process.env.DATABASE_URL = testDb.url;
    process.env.APP_URL = ORIGIN;
    process.env.BOOK_API_BASE_URL = api.url;
    await closeDb();
    resetAuth();
    alice = await signIn(ALICE);
    const res = await run(newAction, alice.post("/lists/new", { name: "Sci-fi" }));
    listId = /^\/lists\/([^/]+)$/.exec(res.location ?? "")![1]!;
  });

  afterAll(async () => {
    await closeDb();
    resetAuth();
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await api.close();
    await testDb.drop();
  });

  it("does not call the API without a query", async () => {
    const before = api.requests.length;
    const res = await show(alice);
    expect(res.data).toMatchObject({ books: [], query: "", search: null });
    expect(api.requests.length).toBe(before);
  });

  it("searches in API order (AC1) and reports no results (AC2)", async () => {
    const res = await show(alice, "?q=dune");
    const data = res.data as LoaderData;
    expect(data.search).toMatchObject({ ok: true });
    expect(data.search?.ok && data.search.books.map((b) => b.title)).toEqual([
      "Dune",
      "Dune Messiah",
      "Dune: House Atreides",
    ]);
    const none = (await show(alice, "?q=zzzz-nothing")).data as LoaderData;
    expect(none.search).toEqual({ ok: true, books: [] });
  });

  it("reports errors, malformed answers and timeouts; the page still loads (AC3, AC4)", async () => {
    for (const q of ["__error__", "__malformed__"]) {
      const res = await show(alice, `?q=${q}`);
      expect(res.status).toBe(200);
      expect((res.data as LoaderData).search).toEqual({ ok: false });
    }
    const started = Date.now();
    const res = await show(alice, "?q=__timeout__");
    expect(Date.now() - started).toBeLessThan(5000);
    expect((res.data as LoaderData).search).toEqual({ ok: false });
    expect((res.data as LoaderData).list.name).toBe("Sci-fi");
  });

  it("adds a book once, keeps it after a reload (AC5)", async () => {
    const res = await addDune(alice);
    expect(res).toMatchObject({ status: 302, location: `/lists/${listId}?q=dune` });
    expect(await addDune(alice)).toMatchObject({ status: 302 });
    const data = (await show(alice)).data as LoaderData;
    expect(data.books).toMatchObject([{ title: "Dune", authors: "Frank Herbert", year: 1965 }]);
    expect(await storedBooks()).toHaveLength(1);
  });

  it("refuses malformed add requests", async () => {
    const res = await run(
      showAction,
      alice.post(`/lists/${listId}`, { intent: "add", title: "No key" }),
      { id: listId },
    );
    expect(res.status).toBe(400);
  });

  it("replayed add requests from bob or anonymous add nothing (AC6)", async () => {
    const other = await run(newAction, alice.post("/lists/new", { name: "Empty" }));
    const emptyId = /^\/lists\/([^/]+)$/.exec(other.location ?? "")![1]!;
    const bob = await signIn(BOB);
    expect((await addDune(bob, emptyId)).status).toBe(404);
    expect((await addDune(new Browser(), emptyId)).location).toBe("/login");
    const books = await getDb().select().from(listBook).where(eq(listBook.listId, emptyId));
    expect(books).toHaveLength(0);
    // Bob cannot search through alice's list either.
    const before = api.requests.length;
    const res = await run(showLoader, bob.get(`/lists/${emptyId}?q=dune`), { id: emptyId });
    expect(res.status).toBe(404);
    expect(api.requests.length).toBe(before);
  });

  it("refuses cross-site add requests", async () => {
    const req = new Request(`${ORIGIN}/lists/${listId}`, {
      method: "POST",
      headers: { cookie: alice.cookieHeader, origin: "https://evil.example" },
      body: new URLSearchParams({ intent: "add", key: "k", title: "Evil" }),
    });
    expect((await run(showAction, req, { id: listId })).status).toBe(403);
  });

  it("a deleted list answers 404 to searches and adds, for everyone", async () => {
    const created = await run(newAction, alice.post("/lists/new", { name: "Gone" }));
    const goneId = /^\/lists\/([^/]+)$/.exec(created.location ?? "")![1]!;
    await addDune(alice, goneId);
    const del = await run(showAction, alice.post(`/lists/${goneId}`, { intent: "delete" }), {
      id: goneId,
    });
    expect(del).toMatchObject({ status: 302, location: "/lists" });
    const bob = await signIn(BOB);
    for (const browser of [alice, bob, new Browser()]) {
      const page = await run(showLoader, browser.get(`/lists/${goneId}?q=dune`), { id: goneId });
      expect(page.status).toBe(404);
      expect((await addDune(browser, goneId)).status).toBe(404);
    }
    const books = await getDb().select().from(listBook).where(eq(listBook.listId, goneId));
    expect(books).toHaveLength(0);
  });
});

describe("list page rendering", () => {
  const list = { id: "abc", name: "Weekend" };

  function render(url: string, loaderData: Partial<LoaderData>) {
    const Stub = createRoutesStub([
      { id: "page", path: "/lists/:id", Component: ShowList as never },
    ]);
    return renderToString(
      <Stub
        initialEntries={[url]}
        hydrationData={{
          loaderData: { page: { list, books: [], query: "", search: null, ...loaderData } },
        }}
      />,
    );
  }
  const alerts = (html: string) => [...html.matchAll(/role="alert"[^>]*>(.*?)<\/div>/gs)];
  const results = (html: string) =>
    /<section aria-labelledby="search-results-heading"[^>]*>(.*?)<\/section>/s.exec(html)?.[1];

  it('has a "Search books" field, a "Search" button and a "Books" section', () => {
    const html = render("/lists/abc", {
      books: [{ id: "1", title: "Dune", authors: "Frank Herbert", year: 1965 }],
    });
    expect(html).toMatch(/<label for="book-query"[^>]*>Search books<\/label>/);
    expect(html).toMatch(/<input id="book-query"[^>]* name="q"/);
    expect(html).toMatch(/<button type="submit"[^>]*>Search<\/button>/);
    expect(html).toMatch(/<h2 id="books-heading"[^>]*>Books<\/h2>/);
    expect(html).toContain("Dune");
    expect(html).toContain("Frank Herbert");
    expect(results(html)).toBeUndefined();
    expect(alerts(html)).toHaveLength(0);
  });

  it('lists results with title, authors, year and an "Add" button each', () => {
    const html = render("/lists/abc?q=dune", {
      query: "dune",
      search: {
        ok: true,
        books: [
          { key: "/works/1", title: "Dune", authors: ["Frank Herbert"], year: 1965 },
          {
            key: "/works/2",
            title: "House",
            authors: ["Brian Herbert", "Kevin J. Anderson"],
            year: null,
          },
        ],
      },
    });
    expect(html).toMatch(/<h2 id="search-results-heading"[^>]*>Search results<\/h2>/);
    const section = results(html)!;
    const items = [...section.matchAll(/<li[^>]*>(.*?)<\/li>/gs)].map((m) => m[1]!);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatch(/Dune.*Frank Herbert.*1965.*>Add<\/button>/s);
    expect(items[1]).toMatch(/House.*Brian Herbert, Kevin J\. Anderson.*>Add<\/button>/s);
    expect(section).toContain('action="/lists/abc?q=dune"');
  });

  it('shows "No books found" without result items', () => {
    const html = render("/lists/abc?q=x", { query: "x", search: { ok: true, books: [] } });
    const section = results(html)!;
    expect(section).toContain("No books found");
    expect(section).not.toMatch(/<li/);
  });

  it("shows one alert when the search is unavailable", () => {
    const html = render("/lists/abc?q=x", { query: "x", search: { ok: false } });
    const found = alerts(html);
    expect(found).toHaveLength(1);
    expect(found[0]![1]).toContain("Book search is unavailable");
  });
});
