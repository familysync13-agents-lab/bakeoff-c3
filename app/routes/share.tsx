import { data } from "react-router";

import type { Route } from "./+types/share";
import { ListBooks } from "../components/list-books";
import { getDb } from "../db/client.server";
import { booksOfSharedList, findSharedList } from "../db/lists.server";
import { verifyShareToken } from "../lib/share-link.server";
import { notFound } from "../lib/http";

export function meta({ loaderData }: Route.MetaArgs) {
  return [
    { title: loaderData ? `${loaderData.list.name} · Shared Reading Lists` : "Not found" },
    { name: "robots", content: "noindex" },
  ];
}

/** Share URLs carry a bearer token: never send it on in Referer headers, never cache the page in shared caches. */
export function headers() {
  return { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
}

export async function loader({ params }: Route.LoaderArgs) {
  const check = verifyShareToken(params.token);
  if (!check.ok) {
    if (check.reason === "expired") throw data("This share link has expired.", { status: 410 });
    notFound();
  }
  const db = getDb();
  const list = await findSharedList(db, check.listId);
  // A deleted list is gone for good; its links answer 404 like any unknown link.
  if (!list) notFound();
  const books = await booksOfSharedList(db, list.id);
  return { list: { name: list.name }, books };
}

export default function SharedList({ loaderData }: Route.ComponentProps) {
  const { list, books } = loaderData;
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-sm font-semibold tracking-wide text-indigo-700 uppercase">
        Shared reading list (read-only)
      </p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight break-words text-slate-900">
        {list.name}
      </h1>
      <ListBooks books={books} />
    </div>
  );
}
