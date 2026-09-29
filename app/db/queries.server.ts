import { count } from "drizzle-orm";

import type { Database } from "./client.server";
import { user } from "./schema";

export async function countUsers(db: Database): Promise<number> {
  const [row] = await db.select({ n: count() }).from(user);
  return row?.n ?? 0;
}
