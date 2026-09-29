import { data } from "react-router";

/** Throws a 404. Other users' lists answer exactly like missing ones, so their existence is not revealed. */
export function notFound(): never {
  throw data("Not found", { status: 404 });
}
