import { Link } from "react-router";

import type { Route } from "./+types/lists";
import { primaryButtonClass } from "../components/forms";
import { getDb } from "../db/client.server";
import { listsOf } from "../db/lists.server";
import { requireUser } from "../lib/auth.server";

export function meta(_: Route.MetaArgs) {
  return [{ title: "My lists · Shared Reading Lists" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const user = await requireUser(request);
  return { lists: await listsOf(getDb(), user.id) };
}

export default function Lists({ loaderData }: Route.ComponentProps) {
  const { lists } = loaderData;
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">My lists</h1>
        <Link to="/lists/new" className={primaryButtonClass}>
          New list
        </Link>
      </div>
      {lists.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-slate-700">
          You have no reading lists yet. Create your first one to start collecting books.
        </p>
      ) : (
        <ul
          className="mt-8 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white shadow-sm"
          style={{ minWidth: 720 }}
        >
          {lists.map((list) => (
            <li key={list.id}>
              <Link
                to={`/lists/${list.id}`}
                className="block px-5 py-4 font-medium break-words text-slate-900 hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-600"
              >
                {list.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
