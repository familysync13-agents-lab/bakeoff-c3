import { data, Form, Link, redirect, useNavigation } from "react-router";

import type { Route } from "./+types/lists.new";
import {
  FormAlert,
  FormPage,
  primaryButtonClass,
  secondaryButtonClass,
  TextField,
} from "../components/forms";
import { getDb } from "../db/client.server";
import { createList } from "../db/lists.server";
import { assertSameOrigin, requireUser } from "../lib/auth.server";
import { formString, LIST_NAME_MAX, validateListName } from "../lib/validation";

export function meta(_: Route.MetaArgs) {
  return [{ title: "New list · Shared Reading Lists" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireUser(request);
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  assertSameOrigin(request);
  const user = await requireUser(request);
  const raw = formString(await request.formData(), "name");
  const result = validateListName(raw);
  if ("error" in result) return data({ error: result.error, name: raw }, { status: 400 });
  const id = await createList(getDb(), user.id, result.name);
  return redirect(`/lists/${id}`);
}

export default function NewList({ actionData }: Route.ComponentProps) {
  const submitting = useNavigation().state === "submitting";
  const alertId = "list-name-error";
  return (
    <FormPage title="New list">
      <Form method="post" noValidate className="space-y-5">
        <FormAlert id={alertId} messages={actionData ? [actionData.error] : []} />
        <TextField
          label="Name"
          name="name"
          autoComplete="off"
          defaultValue={actionData?.name}
          hint={`Up to ${LIST_NAME_MAX} characters.`}
          errorId={actionData ? alertId : undefined}
        />
        <div className="flex flex-wrap gap-3">
          <button type="submit" className={primaryButtonClass} disabled={submitting}>
            Create list
          </button>
          <Link to="/lists" className={secondaryButtonClass}>
            Cancel
          </Link>
        </div>
      </Form>
    </FormPage>
  );
}
