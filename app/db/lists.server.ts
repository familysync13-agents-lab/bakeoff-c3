import { randomUUID } from "node:crypto";

import { and, asc, eq } from "drizzle-orm";

import type { Database } from "./client.server";
import { listBook, readingList } from "./schema";

export type ReadingList = { id: string; name: string };

const columns = { id: readingList.id, name: readingList.name };

// Every query is scoped to the owner: another user's list is indistinguishable from a missing one.

export async function listsOf(db: Database, ownerId: string): Promise<ReadingList[]> {
  return db
    .select(columns)
    .from(readingList)
    .where(eq(readingList.ownerId, ownerId))
    .orderBy(asc(readingList.createdAt), asc(readingList.id));
}

export async function findOwnList(
  db: Database,
  ownerId: string,
  id: string,
): Promise<ReadingList | undefined> {
  const [row] = await db
    .select(columns)
    .from(readingList)
    .where(and(eq(readingList.id, id), eq(readingList.ownerId, ownerId)));
  return row;
}

export async function createList(db: Database, ownerId: string, name: string): Promise<string> {
  const id = randomUUID();
  await db.insert(readingList).values({ id, ownerId, name });
  return id;
}

/** Returns false when the list does not exist or belongs to someone else. */
export async function renameOwnList(
  db: Database,
  ownerId: string,
  id: string,
  name: string,
): Promise<boolean> {
  const rows = await db
    .update(readingList)
    .set({ name })
    .where(and(eq(readingList.id, id), eq(readingList.ownerId, ownerId)))
    .returning({ id: readingList.id });
  return rows.length > 0;
}

/** Permanently deletes the list. Returns false when it does not exist or belongs to someone else. */
export async function deleteOwnList(db: Database, ownerId: string, id: string): Promise<boolean> {
  const rows = await db
    .delete(readingList)
    .where(and(eq(readingList.id, id), eq(readingList.ownerId, ownerId)))
    .returning({ id: readingList.id });
  return rows.length > 0;
}

export type ListBook = { id: string; title: string; authors: string; year: number | null };

/** Books of one of the owner's lists, in the order they were added (empty for other users' lists). */
export async function booksOfOwnList(
  db: Database,
  ownerId: string,
  listId: string,
): Promise<ListBook[]> {
  return db
    .select({
      id: listBook.id,
      title: listBook.title,
      authors: listBook.authors,
      year: listBook.firstPublishYear,
    })
    .from(listBook)
    .innerJoin(readingList, eq(listBook.listId, readingList.id))
    .where(and(eq(listBook.listId, listId), eq(readingList.ownerId, ownerId)))
    .orderBy(asc(listBook.createdAt), asc(listBook.id));
}

export type NewListBook = { key: string; title: string; authors: string; year: number | null };

/**
 * Adds a book to one of the owner's lists; adding a book that is already on the list changes nothing.
 * Returns false when the list does not exist or belongs to someone else.
 */
export async function addBookToOwnList(
  db: Database,
  ownerId: string,
  listId: string,
  book: NewListBook,
): Promise<boolean> {
  if (!(await findOwnList(db, ownerId, listId))) return false;
  await db
    .insert(listBook)
    .values({
      id: randomUUID(),
      listId,
      bookKey: book.key,
      title: book.title,
      authors: book.authors,
      firstPublishYear: book.year,
    })
    .onConflictDoNothing({ target: [listBook.listId, listBook.bookKey] });
  return true;
}

/** Whether a list with this id exists at all (any owner). Used only to answer anonymous visitors 404 vs. sign-in. */
export async function listExists(db: Database, id: string): Promise<boolean> {
  const [row] = await db
    .select({ id: readingList.id })
    .from(readingList)
    .where(eq(readingList.id, id));
  return row !== undefined;
}

/**
 * A list by id regardless of owner. Only for read-only share pages, after the share token was verified: the
 * signed token is what authorizes access here.
 */
export async function findSharedList(db: Database, id: string): Promise<ReadingList | undefined> {
  const [row] = await db.select(columns).from(readingList).where(eq(readingList.id, id));
  return row;
}

/** Books of a list regardless of owner (share pages only, after the share token was verified). */
export async function booksOfSharedList(db: Database, listId: string): Promise<ListBook[]> {
  return db
    .select({
      id: listBook.id,
      title: listBook.title,
      authors: listBook.authors,
      year: listBook.firstPublishYear,
    })
    .from(listBook)
    .where(eq(listBook.listId, listId))
    .orderBy(asc(listBook.createdAt), asc(listBook.id));
}
