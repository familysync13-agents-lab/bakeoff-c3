import { data, Form, Link, redirect, useNavigation } from "react-router";

import type { Route } from "./+types/lists.edit";
import {
  FormAlert,
  FormPage,
  primaryButtonClass,
  secondaryButtonClass,
  TextField,
} from "../components/forms";
import { getDb } from "../db/client.server";
import { findOwnList, renameOwnList } from "../db/lists.server";
import { assertSameOrigin, requireUserForList } from "../lib/auth.server";
import { notFound } from "../lib/http";
import { formString, LIST_NAME_MAX, validateListName } from "../lib/validation";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Edit list · Shared Reading Lists" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const user = await requireUserForList(request, params.id);
  const list = await findOwnList(getDb(), user.id, params.id);
  if (!list) notFound();
  return { list };
}

export async function action({ request, params }: Route.ActionArgs) {
  assertSameOrigin(request);
  const user = await requireUserForList(request, params.id);
  const db = getDb();
  const raw = formString(await request.formData(), "name");
  const result = validateListName(raw);
  if ("error" in result) return data({ error: result.error, name: raw }, { status: 400 });
  if (!(await renameOwnList(db, user.id, params.id, result.name))) notFound();
  return redirect(`/lists/${params.id}`);
}

export default function EditList({ loaderData, actionData }: Route.ComponentProps) {
  const { list } = loaderData;
  const submitting = useNavigation().state === "submitting";
  const alertId = "list-name-error";
  return (
    <FormPage title="Edit list">
      <Form method="post" noValidate className="space-y-5">
        <FormAlert id={alertId} messages={actionData ? [actionData.error] : []} />
        <TextField
          label="Name"
          name="name"
          autoComplete="off"
          defaultValue={actionData?.name ?? list.name}
          hint={`Up to ${LIST_NAME_MAX} characters.`}
          errorId={actionData ? alertId : undefined}
        />
        <div className="flex flex-wrap gap-3">
          <button type="submit" className={primaryButtonClass} disabled={submitting}>
            Save
          </button>
          <Link to={`/lists/${list.id}`} className={secondaryButtonClass}>
            Cancel
          </Link>
        </div>
      </Form>
    </FormPage>
  );
}
