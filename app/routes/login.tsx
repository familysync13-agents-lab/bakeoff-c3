import { data, Form, Link, redirect, useNavigation } from "react-router";

import type { Route } from "./+types/login";
import {
  FormAlert,
  FormPage,
  primaryButtonClass,
  TextField,
  textLinkClass,
} from "../components/forms";
import { assertSameOrigin, sessionCookies, signIn } from "../lib/auth.server";
import { formString } from "../lib/validation";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Sign in · Shared Reading Lists" }];
}

const INVALID = "Invalid email or password.";

export async function action({ request }: Route.ActionArgs) {
  assertSameOrigin(request);
  const form = await request.formData();
  const email = formString(form, "email").trim().toLowerCase();
  const password = formString(form, "password");
  const failed = () => data({ error: INVALID, email }, { status: 401 });
  if (!email || !password) return failed();

  const response = await signIn({ email, password });
  if (!response.ok) return failed();
  return redirect("/lists", { headers: sessionCookies(response) });
}

export default function Login({ actionData }: Route.ComponentProps) {
  const submitting = useNavigation().state === "submitting";
  const alertId = "login-error";
  const errorId = actionData?.error ? alertId : undefined;
  return (
    <FormPage
      title="Welcome back"
      intro={
        <p>
          New here?{" "}
          <Link to="/signup" className={textLinkClass}>
            Create an account
          </Link>
        </p>
      }
    >
      <Form method="post" noValidate className="space-y-5">
        <FormAlert id={alertId} messages={actionData?.error ? [actionData.error] : []} />
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="username"
          defaultValue={actionData?.email}
          errorId={errorId}
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          errorId={errorId}
        />
        <button type="submit" className={`${primaryButtonClass} w-full`} disabled={submitting}>
          Sign in
        </button>
      </Form>
    </FormPage>
  );
}
