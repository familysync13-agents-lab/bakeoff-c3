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

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight text-slate-900">Shared Reading Lists</h1>
      <p className="text-lg text-slate-700">
        Create reading lists, add books and share them read-only with anyone.
      </p>
    </main>
  );
}
