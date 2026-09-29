import { renderToString } from "react-dom/server";
import { createRoutesStub, type HydrationState } from "react-router";
import { describe, expect, it } from "vitest";

import { AppShell } from "../app/components/app-shell";
import EditList from "../app/routes/lists.edit";
import Lists from "../app/routes/lists";
import NewList from "../app/routes/lists.new";
import ShowList from "../app/routes/lists.show";
import Login from "../app/routes/login";
import SignUp from "../app/routes/signup";

type Page = Parameters<typeof createRoutesStub>[0][number]["Component"];

function render(
  path: string,
  pattern: string,
  Component: Page,
  hydrationData: HydrationState = {},
) {
  const Stub = createRoutesStub([{ id: "page", path: pattern, Component }]);
  return renderToString(<Stub initialEntries={[path]} hydrationData={hydrationData} />);
}

const labelOf = (html: string, text: string) =>
  new RegExp(`<label for="[^"]+"[^>]*>${text}</label>`).test(html);
const alerts = (html: string) => [...html.matchAll(/role="alert"[^>]*>(.*?)<\/div>/gs)];
const textOf = (html: string) => html.replace(/<[^>]+>/g, "").trim();

describe("auth pages", () => {
  it('sign-up has fields "Name", "Email", "Password" and a "Sign up" button', () => {
    const html = render("/signup", "/signup", SignUp as Page);
    for (const label of ["Name", "Email", "Password"]) expect(labelOf(html, label)).toBe(true);
    expect(html).toMatch(/<button type="submit"[^>]*>Sign up<\/button>/);
    expect(alerts(html)).toHaveLength(0);
  });

  it("sign-in shows a single alert with Invalid after a failed attempt", () => {
    const html = render("/login", "/login", Login as Page, {
      actionData: { page: { error: "Invalid email or password.", email: "a@b.c" } },
    });
    for (const label of ["Email", "Password"]) expect(labelOf(html, label)).toBe(true);
    expect(html).toMatch(/<button type="submit"[^>]*>Sign in<\/button>/);
    const found = alerts(html);
    expect(found).toHaveLength(1);
    expect(textOf(found[0]![1]!)).toContain("Invalid");
    expect(html).toContain('value="a@b.c"');
  });
});

describe("list pages", () => {
  const list = { id: "abc", name: "Weekend <reads>" };

  it('index: heading "My lists", one link per list, "New list"', () => {
    const html = render("/lists", "/lists", Lists as Page, {
      loaderData: { page: { lists: [list] } },
    });
    expect(html).toMatch(/<h1[^>]*>My lists<\/h1>/);
    expect(html).toMatch(/<a[^>]*href="\/lists\/abc"[^>]*>Weekend &lt;reads&gt;<\/a>/);
    expect(html).toMatch(/<a[^>]*href="\/lists\/new"[^>]*>New list<\/a>/);
  });

  it("new: Name field, Create list button, validation alert keeps the input", () => {
    const html = render("/lists/new", "/lists/new", NewList as Page, {
      actionData: { page: { error: "The name must be at most 100 characters.", name: "x" } },
    });
    expect(labelOf(html, "Name")).toBe(true);
    expect(html).toMatch(/>Create list<\/button>/);
    expect(textOf(alerts(html)[0]![1]!)).toMatch(/name/);
    expect(html).toMatch(/aria-invalid="true"/);
  });

  it("show: h1 is the list name, Edit link and Delete list button", () => {
    const html = render("/lists/abc", "/lists/:id", ShowList as Page, {
      loaderData: { page: { list } },
    });
    const h1s = [...html.matchAll(/<h1[^>]*>(.*?)<\/h1>/gs)];
    expect(h1s).toHaveLength(1);
    expect(h1s[0]![1]).toBe("Weekend &lt;reads&gt;");
    expect(html).toMatch(/<a[^>]*href="\/lists\/abc\/edit"[^>]*>Edit<\/a>/);
    expect(html).toMatch(
      /<form [^>]*action="\/lists\/abc" method="post">.*>Delete list<\/button><\/form>/s,
    );
  });

  it("edit: Name pre-filled and a Save button", () => {
    const html = render("/lists/abc/edit", "/lists/:id/edit", EditList as Page, {
      loaderData: { page: { list } },
    });
    expect(labelOf(html, "Name")).toBe(true);
    expect(html).toContain('value="Weekend &lt;reads&gt;"');
    expect(html).toMatch(/>Save<\/button>/);
  });
});

describe("app shell when signed in", () => {
  it('shows a "Sign out" button posting to /logout instead of the sign-in links', () => {
    const Stub = createRoutesStub([
      {
        path: "/",
        Component: () => (
          <AppShell user={{ name: "Alice" }}>
            <p>content</p>
          </AppShell>
        ),
      },
    ]);
    const html = renderToString(<Stub />);
    expect(html).toMatch(/<form [^>]*action="\/logout" method="post">.*>Sign out<\/button>/s);
    expect(html).not.toMatch(/href="\/login"/);
  });
});
