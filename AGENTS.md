# AGENTS.md - Shared Reading Lists

Guidance for coding agents (and humans) working in this repository.

## Stack

- React Router 8 in framework mode (SSR, loaders/actions), served by `react-router-serve` (Express) on Node 24 LTS.
- TypeScript (`strict`), React 19, Tailwind CSS 4.
- PostgreSQL via Drizzle ORM; migrations generated with drizzle-kit into `drizzle/`.
- Better Auth (email + password) - the schema in `app/db/schema.ts` follows Better Auth's core tables.
- Sentry (`@sentry/react-router`) for error monitoring, server and browser.
- Vitest, ESLint (typescript-eslint), Prettier, dependency-cruiser.

## Layout

- `app/root.tsx`, `app/routes.ts`, `app/routes/*` - UI and resource routes (`/` landing page, `/healthz`, `/signup`,
  `/login`, `/logout` (POST only), `/lists`, `/lists/new`, `/lists/:id` (GET `?q=` searches books; POST
  `intent=delete` deletes, `intent=add` adds a book), `/lists/:id/edit`).
- `app/components/app-shell.tsx` - the app shell rendered by the root `Layout` around every page (skip link, header
  with product name + primary navigation, `<main id="main">`, footer). The shell never renders an `h1`: each page
  owns exactly one. Keep the landing page deterministic (no dates, random or remote content): it has visual baselines.
- `app/components/forms.tsx` - form building blocks. Forms show exactly one `role=alert` (`FormAlert`) and use no
  `required`/`maxLength` attributes: the server validates (works with and without JavaScript).
- `app/lib/auth.server.ts` - Better Auth instance (drizzle adapter). Its HTTP handler is NOT mounted: route actions
  call `auth.api` directly and forward the session cookies. `requireUser()` redirects anonymous visitors to `/login`;
  `assertSameOrigin()` must be called first in every state-changing action.
- `app/db/lists.server.ts` - reading-list queries; every query is scoped to the owner, and other users's lists answer
  404 exactly like missing ones (`notFound()` in `app/lib/http.ts`). Delete is permanent.
- `app/lib/validation.ts` - browser-safe validation (list name 1-100 characters after trimming, password >= 8).
- `app/lib/book-search.server.ts` - book-search client (`BOOK_API_BASE_URL`, Open Library `/search.json`). Gives up
  after 4.5 s; HTTP errors, invalid JSON, network errors and timeouts all return `{ ok: false }` (the page shows
  "Book search is unavailable"), never throw. `app/lib/books.ts` holds the browser-safe book types and form parsing.
  Added books live in `list_book` (unique per list + work key, so adding twice is a no-op).
- `app/entry.server.tsx` / `app/entry.client.tsx` - SSR and hydration entries (Sentry instrumented).
- `app/db/` - schema, connection pool, queries, migrations + seed (`setup.server.ts`, `seed.server.ts`).
- `app/lib/config.server.ts` - the only place that reads environment configuration.
- `app/lib/public-config.ts` - the browser-safe config (DSN, release, environment) rendered as `<meta>` tags.
- `instrument.server.mjs` - server Sentry init, loaded with `node --import` before the server build.
- `scripts/setup.ts` - start-up step (bundled to `build/setup.mjs`): migrations, then seed.
- `tests/` - Vitest unit and integration tests (integration tests need PostgreSQL).

## Commands

- `npm run dev` - development server.
- `npm run check` - lint (ESLint + Prettier + dependency-cruiser), type-check, tests. Must pass before every PR.
- `npm run format` - Prettier.
- `npm run db:generate` - generate a migration after changing `app/db/schema.ts` (commit the files in `drizzle/`).
- `npm run build && npm start` - production build and start (runs migrations + seed first).
- Tests: `DATABASE_URL=postgres://... npm test` (each test file creates and drops its own database; set
  `TEST_DATABASE_URL` to point the tests somewhere else than `DATABASE_URL`).

## Rules

- Secrets (`APP_SECRET`, `V0_SECRET_CANARY`, `SENTRY_DSN`, `DATABASE_URL`) are server-only. Read env only in
  `*.server.ts` modules (ESLint enforces this in `app/`); only `publicConfig()` values reach the browser. Never put
  secrets in loader data, HTML, cookies, client bundles, source maps or error events.
- `*.server.ts` modules may only be imported by routes, `root.tsx`, `entry.server.tsx`, other server modules,
  scripts and tests (dependency-cruiser enforces this).
- Migrations and seed must stay idempotent: the preview container runs them on every start.
- Seed users (from the T0 contract): Alice `alice@example.test` / `Correct-Horse-1`, Bob `bob@example.test` /
  `Battery-Staple-2`.
- Never edit `tasks/`, `oracle/`, `baselines/`, `gate/`, `.github/`, `CODEOWNERS` or `policy.json`.
- Agent/MCP tooling may only ever be a devDependency.
- Never kill processes by matching command lines (`pkill -f`, `grep | kill`): record the PID of servers you start.
- Route modules must not import `*.server.ts` values used by components (the client build fails): put shared
  constants in browser-safe modules such as `app/lib/validation.ts`. `npm run build` catches this, `check` does not.

## TypeScript 7 note

`typescript` in `package.json` is an npm alias of `@typescript/typescript6` (the official TS 6 API package) because
typescript-eslint needs the JavaScript compiler API, which TypeScript 7 (native) does not ship. TypeScript 7 itself is
installed as `@typescript/native` and provides the `tsc` used by `npm run typecheck`.

## Container (shared preview interface, tasks/T0/contract.json)

`Dockerfile` stages: `check` (runs `npm run check`; needs `DATABASE_URL`) and the default `preview` stage (listens on
`0.0.0.0:$PORT`, runs as the unprivileged `node` user with read-only app files, no capabilities needed).
