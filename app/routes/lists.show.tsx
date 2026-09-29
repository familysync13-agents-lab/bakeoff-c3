import { data, Form, Link, redirect, useNavigation } from "react-router";

import type { Route } from "./+types/lists.show";
import {
  dangerButtonClass,
  FormAlert,
  primaryButtonClass,
  secondaryButtonClass,
} from "../components/forms";
import { getDb } from "../db/client.server";
import { addBookToOwnList, booksOfOwnList, deleteOwnList, findOwnList } from "../db/lists.server";
import { assertSameOrigin, requireUserForList } from "../lib/auth.server";
import { searchBooks } from "../lib/book-search.server";
import { type BookResult, formatAuthors, parseAddBookForm, searchQuery } from "../lib/books";
import { notFound } from "../lib/http";
import { formString } from "../lib/validation";

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: loaderData ? `${loaderData.list.name} · Shared Reading Lists` : "Not found" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUserForList(request, params.id);
  const db = getDb();
  const list = await findOwnList(db, user.id, params.id);
  if (!list) notFound();
  // The book API is only asked once ownership is established.
  const query = searchQuery(new URL(request.url));
  const [books, search] = await Promise.all([
    booksOfOwnList(db, user.id, list.id),
    query ? searchBooks(query) : null,
  ]);
  return { list, books, query, search };
}

export async function action({ request, params }: Route.ActionArgs) {
  assertSameOrigin(request);
  const user = await requireUserForList(request, params.id);
  const db = getDb();
  const form = await request.formData();
  const intent = formString(form, "intent");
  if (intent === "delete") {
    if (!(await deleteOwnList(db, user.id, params.id))) notFound();
    return redirect("/lists");
  }
  if (intent === "add") {
    // Ownership is checked before validation so that nothing about other users' lists is revealed.
    if (!(await findOwnList(db, user.id, params.id))) notFound();
    const book = parseAddBookForm(form);
    if (!book) throw data("Bad request", { status: 400 });
    if (!(await addBookToOwnList(db, user.id, params.id, book))) notFound();
    // Back to the list with the same search, so that more results can be added.
    const query = searchQuery(new URL(request.url));
    return redirect(`/lists/${params.id}${query ? `?q=${encodeURIComponent(query)}` : ""}`);
  }
  throw data("Bad request", { status: 400 });
}

export default function ShowList({ loaderData }: Route.ComponentProps) {
  const { list, books, query, search } = loaderData;
  const navigation = useNavigation();
  const submitting = navigation.state === "submitting";
  const searching = navigation.state === "loading" && navigation.formMethod === "GET";
  const searchAction = `/lists/${list.id}`;
  const addAction = `${searchAction}${query ? `?q=${encodeURIComponent(query)}` : ""}`;
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-sm font-semibold tracking-wide text-indigo-700 uppercase">Reading list</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight break-words text-slate-900">
        {list.name}
      </h1>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link to={`/lists/${list.id}/edit`} className={secondaryButtonClass}>
          Edit
        </Link>
        <Form method="post" action={searchAction}>
          <input type="hidden" name="intent" value="delete" />
          <button type="submit" className={dangerButtonClass} disabled={submitting}>
            Delete list
          </button>
        </Form>
      </div>

      <section aria-labelledby="books-heading" className="mt-10">
        <h2 id="books-heading" className="text-xl font-semibold tracking-tight text-slate-900">
          Books
        </h2>
        {books.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-slate-700">
            This list has no books yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
            {books.map((book) => (
              <li key={book.id} className="px-5 py-4">
                <p className="font-semibold break-words text-slate-900">{book.title}</p>
                <p className="mt-0.5 text-sm break-words text-slate-700">
                  {book.authors || "Unknown author"}
                  {book.year !== null && <span> · {book.year}</span>}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <Form
          method="get"
          action={searchAction}
          role="search"
          className="flex flex-wrap items-end gap-3"
        >
          <div className="min-w-0 flex-1 basis-60">
            <label htmlFor="book-query" className="block text-sm font-medium text-slate-900">
              Search books
            </label>
            <input
              id="book-query"
              name="q"
              type="search"
              key={query}
              defaultValue={query}
              autoComplete="off"
              className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 shadow-sm focus:outline-2 focus:outline-offset-0 focus:outline-indigo-600"
            />
          </div>
          <button type="submit" className={primaryButtonClass}>
            Search
          </button>
        </Form>

        {search && (
          <section
            aria-labelledby="search-results-heading"
            aria-busy={searching || undefined}
            className="mt-6"
          >
            <h2
              id="search-results-heading"
              className="text-lg font-semibold tracking-tight text-slate-900"
            >
              Search results
            </h2>
            {!search.ok ? (
              <div className="mt-3">
                <FormAlert messages={["Book search is unavailable. Please try again later."]} />
              </div>
            ) : search.books.length === 0 ? (
              <p className="mt-3 text-slate-700">No books found</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-200">
                {search.books.map((book) => (
                  <SearchResult key={book.key} book={book} action={addAction} busy={submitting} />
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function SearchResult({ book, action, busy }: { book: BookResult; action: string; busy: boolean }) {
  return (
    <li className="flex items-start justify-between gap-4 py-4">
      <div className="min-w-0">
        <p className="font-semibold break-words text-slate-900">{book.title}</p>
        <p className="mt-0.5 text-sm break-words text-slate-700">{formatAuthors(book.authors)}</p>
        {book.year !== null && (
          <p className="mt-0.5 text-sm text-slate-600">First published {book.year}</p>
        )}
      </div>
      <Form method="post" action={action} className="shrink-0">
        <input type="hidden" name="intent" value="add" />
        <input type="hidden" name="key" value={book.key} />
        <input type="hidden" name="title" value={book.title} />
        {book.authors.map((author, i) => (
          <input key={i} type="hidden" name="author" value={author} />
        ))}
        {book.year !== null && <input type="hidden" name="year" value={book.year} />}
        <button type="submit" className={secondaryButtonClass} disabled={busy}>
          Add
        </button>
      </Form>
    </li>
  );
}
