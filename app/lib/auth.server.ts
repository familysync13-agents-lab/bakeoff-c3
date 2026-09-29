import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { redirect } from "react-router";

import { getDb } from "../db/client.server";
import * as schema from "../db/schema";

import { appSecret, appUrl } from "./config.server";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "./validation";

function createAuth() {
  return betterAuth({
    baseURL: appUrl(),
    secret: appSecret(),
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      minPasswordLength: MIN_PASSWORD_LENGTH,
      maxPasswordLength: MAX_PASSWORD_LENGTH,
    },
    telemetry: { enabled: false },
  });
}

type Auth = ReturnType<typeof createAuth>;
let instance: Auth | undefined;

/**
 * The Better Auth server instance, created on first use (configuration is read at run time). Its HTTP handler is
 * not mounted: the app's own route actions call the server API directly and forward the session cookies.
 */
export function getAuth(): Auth {
  instance ??= createAuth();
  return instance;
}

/** Test hook: forget the instance (e.g. after DATABASE_URL changed). */
export function resetAuth(): void {
  instance = undefined;
}

export type SessionUser = { id: string; name: string; email: string };

/** Only the session cookie is passed to Better Auth: its own origin checks do not apply to direct API calls. */
function cookieHeaders(request: Request): Headers {
  const headers = new Headers();
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  return headers;
}

export async function getUser(request: Request): Promise<SessionUser | null> {
  if (!request.headers.get("cookie")) return null;
  const session = await getAuth().api.getSession({ headers: cookieHeaders(request) });
  if (!session) return null;
  const { id, name, email } = session.user;
  return { id, name, email };
}

/** The signed-in user, or a redirect to /login for anonymous visitors. */
export async function requireUser(request: Request): Promise<SessionUser> {
  const user = await getUser(request);
  if (!user) throw redirect("/login");
  return user;
}

/** Copies the Set-Cookie headers of a Better Auth response (session cookies) into new response headers. */
export function sessionCookies(response: Response): Headers {
  const headers = new Headers();
  for (const cookie of response.headers.getSetCookie()) headers.append("set-cookie", cookie);
  return headers;
}

export async function signUp(input: { name: string; email: string; password: string }) {
  return getAuth().api.signUpEmail({ body: input, asResponse: true });
}

export async function signIn(input: { email: string; password: string }) {
  return getAuth().api.signInEmail({ body: input, asResponse: true });
}

export async function signOut(request: Request) {
  return getAuth().api.signOut({ headers: cookieHeaders(request), asResponse: true });
}

/**
 * Cross-site request forgery defence for every state-changing action (in addition to SameSite=Lax session
 * cookies): browsers send Origin / Sec-Fetch-Site on form posts; a foreign origin is refused.
 */
export function assertSameOrigin(request: Request): void {
  const fetchSite = request.headers.get("sec-fetch-site");
  const origin = request.headers.get("origin");
  const allowed = [new URL(request.url).origin, new URL(appUrl()).origin];
  const foreignOrigin = origin !== null && !allowed.includes(origin);
  if (fetchSite === "cross-site" || foreignOrigin) {
    throw new Response("Forbidden", { status: 403 });
  }
}
