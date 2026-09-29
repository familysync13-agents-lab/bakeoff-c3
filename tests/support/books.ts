import http from "node:http";
import type { AddressInfo } from "node:net";

/** Local stand-in for the book-search API test double (same special queries as the preview's double). */
export const DUNE_DOCS = [
  {
    key: "/works/OL893415W",
    title: "Dune",
    author_name: ["Frank Herbert"],
    first_publish_year: 1965,
  },
  {
    key: "/works/OL893526W",
    title: "Dune Messiah",
    author_name: ["Frank Herbert"],
    first_publish_year: 1969,
  },
  {
    key: "/works/OL16808977W",
    title: "Dune: House Atreides",
    author_name: ["Brian Herbert", "Kevin J. Anderson"],
    first_publish_year: 1999,
    cover_i: 8231856,
  },
];

export async function startBookApi(): Promise<{
  url: string;
  requests: URL[];
  close: () => Promise<void>;
}> {
  const requests: URL[] = [];
  const hanging = new Set<http.ServerResponse>();
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://books");
    requests.push(url);
    const q = url.searchParams.get("q") ?? "";
    const json = (status: number, body: string) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(body);
    };
    if (url.pathname !== "/search.json") return json(404, '{"error":"not found"}');
    if (q === "__timeout__") return void hanging.add(res);
    if (q === "__error__") return json(500, '{"error":"internal"}');
    if (q === "__malformed__") return json(200, '{"numFound": 3, "docs": [ {"title": "Dune",');
    if (q === "__nodocs__") return json(200, '{"numFound": 3}');
    if (q === "zzzz-nothing") return json(200, '{"numFound":0,"docs":[]}');
    if (q === "many") {
      const docs = Array.from({ length: 15 }, (_, i) => ({
        key: `/works/M${i}`,
        title: `Book ${i}`,
      }));
      return json(200, JSON.stringify({ numFound: 15, docs }));
    }
    if (q === "sparse") return json(200, '{"numFound":1,"docs":[{}]}');
    json(200, JSON.stringify({ numFound: DUNE_DOCS.length, docs: DUNE_DOCS }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    close: async () => {
      for (const res of hanging) res.destroy();
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}
