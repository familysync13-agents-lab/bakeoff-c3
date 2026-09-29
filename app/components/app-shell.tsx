import { Form, Link, NavLink } from "react-router";

/** The book-stack mark used next to the product name. Decorative: the product name is always rendered as text. */
export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" className={className}>
      <rect width="32" height="32" rx="8" className="fill-indigo-600" />
      <rect x="8" y="8" width="4" height="16" rx="1" className="fill-white" />
      <rect x="14" y="10" width="4" height="14" rx="1" className="fill-indigo-200" />
      <rect
        x="20"
        y="9"
        width="4"
        height="15"
        rx="1"
        transform="rotate(12 22 16.5)"
        className="fill-white"
      />
    </svg>
  );
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    "rounded-lg px-2.5 py-2 text-sm font-medium transition-colors sm:px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600",
    isActive ? "text-indigo-700" : "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
  ].join(" ");

/** The signed-in user as shown by the shell (never more than the display name). */
export type ShellUser = { name: string };

export function SiteHeader({ user }: { user?: ShellUser | null }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 sm:gap-3 sm:px-6">
        <Link
          to="/"
          className="flex min-w-0 items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600"
        >
          <LogoMark className="size-7 shrink-0 sm:size-8" />
          <span className="truncate text-sm font-semibold tracking-tight text-slate-900 sm:text-lg">
            Shared Reading Lists
          </span>
        </Link>
        <nav aria-label="Primary" className="shrink-0">
          {user ? (
            <ul className="flex items-center gap-1 sm:gap-2">
              <li>
                <NavLink to="/lists" end className={navLinkClass}>
                  Lists
                </NavLink>
              </li>
              <li>
                <Form method="post" action="/logout">
                  <button
                    type="submit"
                    className="rounded-lg px-2.5 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:px-3"
                  >
                    Sign out
                  </button>
                </Form>
              </li>
            </ul>
          ) : (
            <ul className="flex items-center gap-1 sm:gap-2">
              <li>
                <NavLink to="/login" className={navLinkClass}>
                  Sign in
                </NavLink>
              </li>
              <li>
                <Link
                  to="/signup"
                  className="rounded-lg bg-indigo-600 px-2.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:px-4"
                >
                  Sign up
                </Link>
              </li>
            </ul>
          )}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2">
          <LogoMark className="size-6" />
          <span className="font-semibold text-slate-800">Shared Reading Lists</span>
        </div>
        <p>Create reading lists, add books and share them read-only.</p>
      </div>
    </footer>
  );
}

/** The app shell used by every page: skip link, header with primary navigation, main content area, footer. */
export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: ShellUser | null;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only z-30 rounded-lg bg-white px-4 py-2 font-medium text-indigo-700 shadow focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <SiteHeader user={user} />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
