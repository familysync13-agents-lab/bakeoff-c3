/** Book search and list-book values shared by the server and the list page (pure, browser-safe). */

export const BOOK_RESULTS_MAX = 10;
export const BOOK_QUERY_MAX = 200;
export const BOOK_KEY_MAX = 300;
export const BOOK_TITLE_MAX = 500;
export const BOOK_AUTHORS_MAX = 1000;

/** A book-search result: title, author names and first publish year as the API reported them. */
export type BookResult = { key: string; title: string; authors: string[]; year: number | null };

/** The search query from the `q` URL parameter (trimmed, bounded); empty = no search. */
export function searchQuery(url: URL): string {
  return [...(url.searchParams.get("q") ?? "").trim()].slice(0, BOOK_QUERY_MAX).join("");
}

export function formatAuthors(authors: readonly string[]): string {
  return authors.length > 0 ? authors.join(", ") : "Unknown author";
}

/** The book fields posted by an "Add" button (hidden inputs), or null when they are missing or too long. */
export function parseAddBookForm(
  form: FormData,
): { key: string; title: string; authors: string; year: number | null } | null {
  const text = (name: string) => {
    const value = form.get(name);
    return typeof value === "string" ? value.trim() : "";
  };
  const key = text("key");
  const title = text("title");
  const authors = form
    .getAll("author")
    .filter((a): a is string => typeof a === "string")
    .map((a) => a.trim())
    .filter(Boolean)
    .join(", ");
  const rawYear = text("year");
  const year = /^-?\d{1,4}$/.test(rawYear) ? Number(rawYear) : null;
  if (!key || key.length > BOOK_KEY_MAX) return null;
  if (!title || title.length > BOOK_TITLE_MAX || authors.length > BOOK_AUTHORS_MAX) return null;
  if (rawYear && year === null) return null;
  return { key, title, authors, year };
}
