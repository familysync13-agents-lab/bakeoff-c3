import { createReadableStreamFromReadable } from "@react-router/node";
import * as Sentry from "@sentry/react-router";
import { renderToPipeableStream } from "react-dom/server";
import { type HandleErrorFunction, isRouteErrorResponse, ServerRouter } from "react-router";

// Streaming SSR (the default React Router Node entry), instrumented by the official Sentry SDK.
const handleRequest = Sentry.createSentryHandleRequest({
  ServerRouter,
  renderToPipeableStream,
  createReadableStreamFromReadable,
});

export default handleRequest;

const sentryHandleError = Sentry.createSentryHandleError({ logErrors: true });

/** Unexpected server errors go to error monitoring; client errors such as 404s are not reported. */
export const handleError: HandleErrorFunction = (error, args) => {
  if (isRouteErrorResponse(error) && error.status < 500) return;
  return sentryHandleError(error, args);
};
