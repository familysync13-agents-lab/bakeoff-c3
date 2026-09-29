import { randomUUID } from "node:crypto";

import { hashPassword } from "better-auth/crypto";

import type { Database } from "./client.server";
import { account, user } from "./schema";

/** Seed accounts of the preview interface (tasks/T0 contract). Synthetic credentials, not secrets. */
export const SEED_USERS = [
  { name: "Alice", email: "alice@example.test", password: "Correct-Horse-1" },
  { name: "Bob", email: "bob@example.test", password: "Battery-Staple-2" },
] as const;

/**
 * Creates each seed user with a Better Auth email/password ("credential") account, unless a user with that
 * email already exists. Idempotent: running it again changes nothing.
 */
export async function seed(db: Database): Promise<void> {
  for (const u of SEED_USERS) {
    await db.transaction(async (tx) => {
      const id = randomUUID();
      const inserted = await tx
        .insert(user)
        .values({ id, name: u.name, email: u.email, emailVerified: true })
        .onConflictDoNothing({ target: user.email })
        .returning({ id: user.id });
      if (inserted.length === 0) return;
      await tx.insert(account).values({
        id: randomUUID(),
        accountId: id,
        providerId: "credential",
        userId: id,
        password: await hashPassword(u.password),
      });
    });
  }
}
