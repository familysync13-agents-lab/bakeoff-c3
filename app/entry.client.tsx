import * as Sentry from "@sentry/react-router";
import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";

import { readPublicConfig } from "./lib/public-config";

const config = readPublicConfig(document);
if (config.sentryDsn) {
  Sentry.init({
    dsn: config.sentryDsn,
    release: config.release,
    environment: config.environment,
  });
}

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter onError={Sentry.sentryOnError} />
    </StrictMode>,
  );
});
