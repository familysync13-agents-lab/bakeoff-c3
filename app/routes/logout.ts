import { redirect } from "react-router";

import type { Route } from "./+types/logout";
import { assertSameOrigin, sessionCookies, signOut } from "../lib/auth.server";

/** Sign out only via POST (the shell's "Sign out" button); a GET just goes home. */
export function loader() {
  return redirect("/");
}

export async function action({ request }: Route.ActionArgs) {
  assertSameOrigin(request);
  const response = await signOut(request);
  return redirect("/", { headers: sessionCookies(response) });
}
