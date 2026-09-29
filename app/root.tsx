import * as Sentry from "@sentry/react-router";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import { AppShell } from "./components/app-shell";
import { getUser } from "./lib/auth.server";
import { publicConfig } from "./lib/config.server";
import { PUBLIC_CONFIG_META } from "./lib/public-config";

export async function loader({ request }: Route.LoaderArgs) {
  const user = await getUser(request);
  // Only the display name reaches the browser (never ids, emails, tokens or configuration secrets).
  return { publicConfig: publicConfig(), user: user ? { name: user.name } : null };
}

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useRouteLoaderData<typeof loader>("root");
  const config = data?.publicConfig;
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {config && (
          <>
            <meta name={PUBLIC_CONFIG_META.sentryDsn} content={config.sentryDsn} />
            <meta name={PUBLIC_CONFIG_META.release} content={config.release} />
            <meta name={PUBLIC_CONFIG_META.environment} content={config.environment} />
          </>
        )}
        <Meta />
        <Links />
      </head>
      <body className="bg-white font-sans text-slate-900 antialiased">
        <AppShell user={data?.user}>{children}</AppShell>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let title = "Something went wrong";
  let details = "An unexpected error occurred. Please try again.";
  if (isRouteErrorResponse(error)) {
    title = error.status === 404 ? "Page not found" : `Error ${error.status}`;
    details =
      error.status === 404 ? "The page you are looking for does not exist." : error.statusText;
  } else {
    Sentry.captureException(error);
  }
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="mt-4 text-slate-700">{details}</p>
    </div>
  );
}
