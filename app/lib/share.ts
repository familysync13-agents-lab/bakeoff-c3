/** Share-link expiry choices shared by the server and the list page (pure, browser-safe). */

export const SHARE_EXPIRY_OPTIONS = [
  { value: "1m", label: "1 minute", seconds: 60 },
  { value: "1d", label: "1 day", seconds: 24 * 60 * 60 },
  { value: "7d", label: "7 days", seconds: 7 * 24 * 60 * 60 },
] as const;

export const DEFAULT_SHARE_EXPIRY = "7d";

/** Lifetime in seconds of a posted expiry choice, or null when it is not one of the options. */
export function shareExpirySeconds(value: string): number | null {
  return SHARE_EXPIRY_OPTIONS.find((option) => option.value === value)?.seconds ?? null;
}
