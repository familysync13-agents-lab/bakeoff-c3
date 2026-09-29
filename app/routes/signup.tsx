import { data, Form, Link, redirect, useNavigation } from "react-router";

import type { Route } from "./+types/signup";
import {
  FormAlert,
  FormPage,
  primaryButtonClass,
  TextField,
  textLinkClass,
} from "../components/forms";
import { assertSameOrigin, sessionCookies, signUp } from "../lib/auth.server";
import {
  charCount,
  formString,
  isEmail,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "../lib/validation";

export function meta(_: Route.MetaArgs) {
  return [{ title: "Sign up · Shared Reading Lists" }];
}

type Field = "name" | "email" | "password";

export async function action({ request }: Route.ActionArgs) {
  assertSameOrigin(request);
  const form = await request.formData();
  const name = formString(form, "name").trim();
  const email = formString(form, "email").trim().toLowerCase();
  const password = formString(form, "password");

  const errors: Partial<Record<Field, string>> = {};
  if (!name) errors.name = "Enter your name.";
  else if (charCount(name) > 100) errors.name = "The name must be at most 100 characters.";
  if (!isEmail(email)) errors.email = "Enter a valid email address.";
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `The password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  } else if (password.length > MAX_PASSWORD_LENGTH) {
    errors.password = `The password must be at most ${MAX_PASSWORD_LENGTH} characters.`;
  }
  const values = { name, email };
  if (Object.keys(errors).length > 0) return data({ errors, values }, { status: 400 });

  const response = await signUp({ name, email, password });
  if (!response.ok) {
    const failed: Partial<Record<Field, string>> =
      response.status === 422
        ? { email: "An account with this email already exists. Sign in instead." }
        : { email: "Sign-up failed. Check your email address and password and try again." };
    return data({ errors: failed, values }, { status: 400 });
  }
  return redirect("/lists", { headers: sessionCookies(response) });
}

export default function SignUp({ actionData }: Route.ComponentProps) {
  const errors: Partial<Record<Field, string>> = actionData?.errors ?? {};
  const values = actionData?.values;
  const submitting = useNavigation().state === "submitting";
  const alertId = "signup-errors";
  const errorId = (field: Field) => (errors[field] ? alertId : undefined);
  return (
    <FormPage
      title="Create your account"
      intro={
        <p>
          Already have an account?{" "}
          <Link to="/login" className={textLinkClass}>
            Sign in instead
          </Link>
        </p>
      }
    >
      <Form method="post" noValidate className="space-y-5">
        <FormAlert id={alertId} messages={Object.values(errors)} />
        <TextField
          label="Name"
          name="name"
          autoComplete="name"
          defaultValue={values?.name}
          errorId={errorId("name")}
        />
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={values?.email}
          errorId={errorId("email")}
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
          errorId={errorId("password")}
        />
        <button type="submit" className={`${primaryButtonClass} w-full`} disabled={submitting}>
          Sign up
        </button>
      </Form>
    </FormPage>
  );
}
