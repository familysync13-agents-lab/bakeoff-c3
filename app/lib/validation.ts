/** Form validation shared by the auth and list routes (pure, browser-safe). */

export const LIST_NAME_MAX = 100;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

export function formString(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

/** Characters as users count them (code points), so e.g. emoji count once. */
export function charCount(value: string): number {
  return [...value].length;
}

export function validateListName(raw: string): { name: string } | { error: string } {
  const name = raw.trim();
  if (charCount(name) === 0) return { error: "Enter a name for the list (the name is required)." };
  if (charCount(name) > LIST_NAME_MAX) {
    return { error: `The name must be at most ${LIST_NAME_MAX} characters.` };
  }
  return { name };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmail(value: string): boolean {
  return value.length <= 254 && EMAIL_PATTERN.test(value);
}
