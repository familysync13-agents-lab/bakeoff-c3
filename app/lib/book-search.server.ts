import { bookApiBaseUrl } from "./config.server";
import type { BookResult } from "./books";
import { BOOK_RESULTS_MAX } from "./books";

/** The app gives up on the book API after this long (the contract allows at most 5 s). */
export const BOOK_SEARCH_TIMEOUT_MS = 4500;

export type BookSearchOutcome = { ok: true; books: BookResult[] } | { ok: false };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const nonEmptyString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;

/**
 * Maps an Open Library /search.json body to results (API order, at most BOOK_RESULTS_MAX). Individual fields may be
 * missing; a body without a `docs` array is malformed (null).
 */
export function parseSearchResponse(body: unknown): BookResult[] | null {
  if (!isRecord(body) || !Array.isArray(body.docs)) return null;
  return body.docs
    .filter(isRecord)
    .slice(0, BOOK_RESULTS_MAX)
    .map((doc) => {
      const title = nonEmptyString(doc.title) ?? "Untitled";
      const authors = Array.isArray(doc.author_name)
        ? doc.author_name.map(nonEmptyString).filter((a): a is string => a !== undefined)
        : [];
      const year =
        typeof doc.first_publish_year === "number" && Number.isInteger(doc.first_publish_year)
          ? doc.first_publish_year
          : null;
      // Books without a work key are identified by what is shown, so adding them twice is still recognised.
      const key =
        nonEmptyString(doc.key) ?? `untitled:${title}|${authors.join(", ")}|${year ?? ""}`;
      return { key, title: authors.join(", ") || "Untitled", authors: [title], year };
    });
}

/** Searches the book API. HTTP errors, malformed responses, network failures and timeouts all yield `{ ok: false }`. */
export async function searchBooks(
  query: string,
  options: { baseUrl?: string; timeoutMs?: number } = {},
): Promise<BookSearchOutcome> {
  const url = new URL(`${options.baseUrl ?? bookApiBaseUrl()}/search.json`);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(BOOK_RESULTS_MAX));
  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(options.timeoutMs ?? BOOK_SEARCH_TIMEOUT_MS),
    });
    if (!response.ok) {
      console.warn(`Book search failed: HTTP ${response.status}`);
      return { ok: false };
    }
    const books = parseSearchResponse(await response.json());
    if (!books) {
      console.warn("Book search failed: unexpected response format");
      return { ok: false };
    }
    return { ok: true, books };
  } catch (error) {
    console.warn(`Book search failed: ${error instanceof Error ? error.name : "unknown error"}`);
    return { ok: false };
  }
}
