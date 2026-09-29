/** Helpers to call route loaders/actions directly with real Request objects and a per-user cookie jar. */

export const ORIGIN = "http://localhost:5173";

export class Browser {
  private cookies = new Map<string, string>();

  get cookieHeader(): string {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  /** Applies Set-Cookie headers (including deletions via Max-Age=0). */
  receive(response: Response): void {
    for (const line of response.headers.getSetCookie()) {
      const [pair = "", ...attrs] = line.split(";");
      const eq = pair.indexOf("=");
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      const expired = attrs.some((a) => /^\s*max-age=0\s*$/i.test(a)) || value === "";
      if (expired) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }

  get(path: string): Request {
    return new Request(`${ORIGIN}${path}`, { headers: this.headers() });
  }

  post(path: string, fields: Record<string, string>): Request {
    return new Request(`${ORIGIN}${path}`, {
      method: "POST",
      headers: { ...this.headers(), origin: ORIGIN, "sec-fetch-site": "same-origin" },
      body: new URLSearchParams(fields),
    });
  }

  private headers(): Record<string, string> {
    return this.cookieHeader ? { cookie: this.cookieHeader } : {};
  }
}

type RouteFn = (args: never) => unknown;

/** Runs a loader/action; returns the Response it returned or threw (redirects, 404s) or its data. */
export async function run(
  fn: RouteFn,
  request: Request,
  params: Record<string, string> = {},
): Promise<{ status: number; location: string | null; response?: Response; data?: unknown }> {
  try {
    const result = await fn({ request, params, context: {} } as never);
    return fromResult(result);
  } catch (thrown) {
    return fromResult(thrown);
  }
}

function fromResult(result: unknown) {
  if (result instanceof Response) {
    return { status: result.status, location: result.headers.get("location"), response: result };
  }
  if (
    result &&
    typeof result === "object" &&
    "type" in result &&
    result.type === "DataWithResponseInit"
  ) {
    const r = result as unknown as { data: unknown; init?: { status?: number } };
    return { status: r.init?.status ?? 200, location: null, data: r.data };
  }
  if (result instanceof Error) throw result;
  return { status: 200, location: null, data: result };
}
