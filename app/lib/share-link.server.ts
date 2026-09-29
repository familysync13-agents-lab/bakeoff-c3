import { createHmac, timingSafeEqual } from "node:crypto";

import { shareLinkSecret } from "./config.server";

/**
 * Read-only share links: the token is `{listId}.{expiresAt}.{signature}` where expiresAt is a Unix time in seconds
 * and signature = base64url(HMAC-SHA256(V0_SECRET_CANARY, "share-v1.{listId}.{expiresAt}")). It binds the list and
 * the expiry time; there is no server-side state (links cannot be revoked, only expire or die with the list).
 */

const LIST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const EXPIRES_AT = /^[1-9][0-9]{0,11}$/;

function sign(listId: string, expiresAt: number, key: string): string {
  return createHmac("sha256", key).update(`share-v1.${listId}.${expiresAt}`).digest("base64url");
}

export function createShareToken(
  listId: string,
  expiresAt: number,
  key: string = shareLinkSecret(),
): string {
  return `${listId}.${expiresAt}.${sign(listId, expiresAt, key)}`;
}

export type ShareTokenCheck =
  { ok: true; listId: string; expiresAt: number } | { ok: false; reason: "invalid" | "expired" };

/**
 * Verifies a token. The whole token is compared against the canonical token recomputed from its parts, so any
 * altered, truncated or extended token (including non-canonical encodings of the same bytes) is invalid.
 */
export function verifyShareToken(
  token: string,
  now: number = Date.now(),
  key: string = shareLinkSecret(),
): ShareTokenCheck {
  const [listId = "", rawExpiresAt = "", ...rest] = token.split(".");
  if (rest.length !== 1 || !LIST_ID.test(listId) || !EXPIRES_AT.test(rawExpiresAt)) {
    return { ok: false, reason: "invalid" };
  }
  const expiresAt = Number(rawExpiresAt);
  const expected = Buffer.from(createShareToken(listId, expiresAt, key));
  const actual = Buffer.from(token);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return { ok: false, reason: "invalid" };
  }
  if (Math.floor(now / 1000) >= expiresAt) return { ok: false, reason: "expired" };
  return { ok: true, listId, expiresAt };
}
