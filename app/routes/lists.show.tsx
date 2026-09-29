import { data, Form, Link, redirect, useNavigation } from "react-router";

import type { Route } from "./+types/lists.show";
import { dangerButtonClass, secondaryButtonClass } from "../components/forms";
import { getDb } from "../db/client.server";
import { deleteOwnList, findOwnList } from "../db/lists.server";
import { assertSameOrigin, requireUser } from "../lib/auth.server";
import { notFound } from "../lib/http";
import { formString } from "../lib/validation";

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: loaderData ? `${loaderData.list.name} · Shared Reading Lists` : "Not found" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUser(request);
  const list = await findOwnList(getDb(), user.id, params.id);
  if (!list) notFound();
  return { list };
}

export async function action({ request, params }: Route.ActionArgs) {
  assertSameOrigin(request);
  const user = await requireUser(request);
  const form = await request.formData();
  if (formString(form, "intent") !== "delete") throw data("Bad request", { status: 400 });
  if (!(await deleteOwnList(getDb(), user.id, params.id))) notFound();
  return redirect("/lists");
}

export default function ShowList({ loaderData }: Route.ComponentProps) {
  const { list } = loaderData;
  const deleting = useNavigation().state === "submitting";
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
        <Form method="post">
          <input type="hidden" name="intent" value="delete" />
          <button type="submit" className={dangerButtonClass} disabled={deleting}>
            Delete list
          </button>
        </Form>
      </div>
      <p className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-slate-700">
        This list has no books yet.
      </p>
    </div>
  );
}
