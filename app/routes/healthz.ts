import { getDb } from "../db/client.server";
import { countUsers } from "../db/queries.server";
import { appEnv } from "../lib/config.server";

export async function loader() {
  const users = await countUsers(getDb());
  return Response.json(
    { status: "ok", env: appEnv(), users },
    { headers: { "Cache-Control": "no-store" } },
  );
}
