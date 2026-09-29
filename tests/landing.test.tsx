import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { AppShell } from "../app/components/app-shell";
import Home, { meta } from "../app/routes/home";

function renderLanding() {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={["/"]}>
      <AppShell>
        <Home />
      </AppShell>
    </MemoryRouter>,
  );
}

const textOf = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** All <a> elements as { href, name } (name = the visible text content). */
function links(html: string) {
  return [...html.matchAll(/<a\b([^>]*)>(.*?)<\/a>/gs)].map(([, attrs = "", inner = ""]) => ({
    href: /href="([^"]*)"/.exec(attrs)?.[1],
    name: textOf(inner),
  }));
}

describe("landing page (GET /, signed out)", () => {
  const html = renderLanding();

  it("has exactly one h1 containing the product name", () => {
    const h1s = [...html.matchAll(/<h1\b[^>]*>(.*?)<\/h1>/gs)].map(([, inner = ""]) =>
      textOf(inner),
    );
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toContain("Shared Reading Lists");
  });

  it('links "Sign up" to /signup and "Sign in" to /login', () => {
    const all = links(html);
    const signUp = all.filter((l) => l.name === "Sign up");
    const signIn = all.filter((l) => l.name === "Sign in");
    expect(signUp.length).toBeGreaterThan(0);
    expect(signIn.length).toBeGreaterThan(0);
    expect(signUp.every((l) => l.href === "/signup")).toBe(true);
    expect(signIn.every((l) => l.href === "/login")).toBe(true);
  });

  it("communicates what the product does", () => {
    const text = textOf(html);
    expect(text).toMatch(/Create reading lists/);
    expect(text).toMatch(/add books/i);
    expect(text).toMatch(/read-only/);
    expect(meta({} as Parameters<typeof meta>[0])).toContainEqual({
      title: "Shared Reading Lists",
    });
  });
});

describe("app shell", () => {
  const html = renderToStaticMarkup(
    <MemoryRouter>
      <AppShell>
        <p>Page content</p>
      </AppShell>
    </MemoryRouter>,
  );

  it("renders header with product name and primary navigation, main area and footer", () => {
    expect(html).toMatch(/<header\b/);
    expect(html).toMatch(/<nav aria-label="Primary"/);
    expect(html).toMatch(/<main id="main"[^>]*>\s*<p>Page content<\/p>\s*<\/main>/);
    expect(html).toMatch(/<footer\b/);
    expect(links(html)).toContainEqual({ href: "/", name: "Shared Reading Lists" });
    expect(links(html)).toContainEqual({ href: "#main", name: "Skip to content" });
  });

  it("does not render an h1 itself (pages own their single h1)", () => {
    expect(html).not.toMatch(/<h1\b/);
  });
});
