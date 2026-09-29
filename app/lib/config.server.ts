import type { PublicConfig } from "./public-config";

/** Runtime configuration read from the environment (server only). */
export function appEnv(): string {
  return process.env.APP_ENV || "development";
}

export function appRelease(): string {
  return process.env.APP_RELEASE || "dev";
}

export function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
}

/**
 * The only configuration that may be sent to the browser. It is an explicit allow-list:
 * server-side secrets (APP_SECRET, V0_SECRET_CANARY, SENTRY_DSN, DATABASE_URL) must never be added here.
 */
export function publicConfig(): PublicConfig {
  return {
    sentryDsn: process.env.PUBLIC_SENTRY_DSN ?? "",
    release: appRelease(),
    environment: appEnv(),
  };
}

const DEV_SECRET = "development-only-secret-not-for-previews-0123456789";

/** Key for session signing (Better Auth). Required outside local development and tests. */
export function appSecret(): string {
  const secret = process.env.APP_SECRET;
  if (secret) return secret;
  if (["development", "test"].includes(appEnv())) return DEV_SECRET;
  throw new Error("APP_SECRET is not set");
}

/** Absolute base URL the app is reached at (APP_URL). */
export function appUrl(): string {
  return process.env.APP_URL || `http://localhost:${process.env.PORT || "5173"}`;
}
