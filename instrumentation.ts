/**
 * Sentry Server-Side Instrumentation
 *
 * This file initializes Sentry on the server for:
 * - Server-side error tracking
 * - API route error handling
 * - Database error monitoring
 * - Request/response tracking
 *
 * See: https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/#create-initialization-config-files
 */

import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Server-side initialization
    // This runs once when the server starts
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

      // Production-only by default
      enabled: process.env.NODE_ENV === "production",

      // No debug logging in production
      debug: false,

      // Environment tracking
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,

      // Capture 100% of errors in production
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

      // Ignore certain errors that are not useful
      ignoreErrors: [
        // Browser extensions
        "chrome-extension://",
        "moz-extension://",
        // Network errors that are expected
        "NetworkError",
        "TimeoutError",
        // Abort errors (user cancelled)
        "AbortError",
      ], 

      beforeSend(event, hint) {
        // Filter out errors that shouldn't be sent to Sentry
        if (event.exception) {
          const error = hint.originalException as { message?: string } | undefined;

          // Don't send user-triggered cancellations
          if (error?.message && error.message.includes("cancel")) {
            return null;
          }

          // Don't send abort errors
          if (error?.message && error.message.includes("AbortError")) {
            return null;
          }
        }

        return event;
      },
    });

  }
}

/**
 * onRequestError Hook
 *
 * Captures errors from nested React Server Components and API routes
 * This runs on every request that encounters an error
 */
export async function onRequestError(
  error: Error,
  request: Request
) {
  Sentry.captureException(error, {
    contexts: {
      request: {
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers),
      },
    },
    tags: {
      type: "request_error",
    },
  });
}
