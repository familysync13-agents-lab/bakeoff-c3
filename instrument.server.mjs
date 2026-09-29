// Loaded before the server build (`node --import ./instrument.server.mjs`): official Sentry SDK, server side.
import * as Sentry from "@sentry/react-router";

const dsn = process.env.SENTRY_DSN;
const canary = process.env.V0_SECRET_CANARY;

/** Defence in depth: server-side secrets must never leave the server inside an error event. */
function redactSecrets(event) {
  if (!canary) return event;
  const json = JSON.stringify(event);
  return json.includes(canary) ? JSON.parse(json.split(canary).join("[redacted]")) : event;
}

if (dsn) {
  Sentry.init({
    dsn,
    release: process.env.APP_RELEASE || "dev",
    environment: process.env.APP_ENV || "development",
    beforeSend: redactSecrets,
  });
}
