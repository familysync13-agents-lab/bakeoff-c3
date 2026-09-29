import { Link } from "react-router";

import type { Route } from "./+types/home";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Shared Reading Lists" },
    {
      name: "description",
      content: "Create reading lists, add books and share them read-only.",
    },
  ];
}

const FEATURES = [
  {
    title: "Create reading lists",
    body: "Start a list for anything: this summer's novels, a book club, a course syllabus. Rename or delete it whenever you like.",
    icon: "M4 6h16M4 12h16M4 18h10",
  },
  {
    title: "Add books in seconds",
    body: "Search by title or author and add the right edition with one click, complete with authors and first publication year.",
    icon: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4-4",
  },
  {
    title: "Share them read-only",
    body: "Send a link that expires when you choose. Friends see the list and its books without an account, and nobody can change it.",
    icon: "M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1",
  },
] as const;

const STEPS = [
  { title: "Sign up", body: "Create a free account with your email address." },
  { title: "Build a list", body: "Name your list and add the books you want to read." },
  { title: "Share the link", body: "Anyone with the link can view it. Only you can edit it." },
] as const;

const SAMPLE_BOOKS = [
  {
    title: "The Left Hand of Darkness",
    author: "Ursula K. Le Guin",
    year: 1969,
    tone: "bg-amber-500",
  },
  { title: "Beloved", author: "Toni Morrison", year: 1987, tone: "bg-rose-600" },
  { title: "Pride and Prejudice", author: "Jane Austen", year: 1813, tone: "bg-emerald-600" },
] as const;

const buttonBase =
  "inline-flex items-center justify-center rounded-xl px-5 py-3 text-base font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";

function ListPreview() {
  return (
    <figure className="relative mx-auto w-full max-w-md">
      <div
        aria-hidden="true"
        className="absolute -inset-3 -z-10 rotate-2 rounded-3xl bg-indigo-100 sm:-inset-4"
      />
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-indigo-900/10 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-wide text-indigo-700 uppercase">
              Reading list
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900">Weekend reads</p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
            <svg viewBox="0 0 20 20" aria-hidden="true" className="size-3.5 fill-current">
              <path d="M10 3C5.5 3 2 7.5 1.5 10c.5 2.5 4 7 8.5 7s8-4.5 8.5-7C18 7.5 14.5 3 10 3Zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0-2a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
            </svg>
            Read-only link
          </span>
        </div>
        <ul className="mt-5 divide-y divide-slate-100">
          {SAMPLE_BOOKS.map((book) => (
            <li key={book.title} className="flex items-center gap-3 py-3">
              <span
                aria-hidden="true"
                className={`h-12 w-9 shrink-0 rounded-sm shadow-sm ${book.tone}`}
              />
              <span className="min-w-0">
                <span className="block truncate font-medium text-slate-900">{book.title}</span>
                <span className="block text-sm text-slate-600">
                  {book.author} · {book.year}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <figcaption className="sr-only">
        Example of a shared reading list called Weekend reads with three books.
      </figcaption>
    </figure>
  );
}

export default function Home() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50 via-white to-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-16 lg:py-24">
          <div className="text-center lg:text-left">
            <p className="inline-flex items-center rounded-full bg-white px-3 py-1 text-sm font-medium text-indigo-700 ring-1 ring-indigo-200">
              Reading lists, made to share
            </p>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-balance text-slate-900 sm:text-5xl lg:text-6xl">
              Shared Reading Lists
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-pretty text-slate-700 sm:text-xl lg:mx-0">
              Create reading lists, add the books you love and share them with anyone through a
              read-only link. Keep your next great read one tap away.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <Link
                to="/signup"
                className={`${buttonBase} bg-indigo-600 text-white shadow-sm hover:bg-indigo-700`}
              >
                Sign up
              </Link>
              <Link
                to="/login"
                className={`${buttonBase} bg-white text-slate-900 ring-1 ring-slate-300 hover:bg-slate-50`}
              >
                Sign in
              </Link>
            </div>
            <p className="mt-4 text-sm text-slate-600">Free to use. No credit card required.</p>
          </div>
          <ListPreview />
        </div>
      </section>

      <section aria-labelledby="features-heading" className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2
              id="features-heading"
              className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
            >
              Everything your reading list needs
            </h2>
            <p className="mt-4 text-lg text-slate-700">
              A simple home for the books you want to read, and an easy way to pass them on.
            </p>
          </div>
          <ul className="mt-12 grid gap-6 md:grid-cols-3">
            {FEATURES.map((feature) => (
              <li
                key={feature.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <span className="inline-flex size-11 items-center justify-center rounded-xl bg-indigo-600 text-white">
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="size-6 fill-none stroke-current stroke-2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d={feature.icon} />
                  </svg>
                </span>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-slate-700">{feature.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        aria-labelledby="steps-heading"
        className="border-t border-slate-200 bg-slate-50 py-16 sm:py-20"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2
            id="steps-heading"
            className="text-center text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
          >
            How it works
          </h2>
          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white font-bold text-indigo-700 ring-1 ring-indigo-200"
                >
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-1 text-slate-700">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
