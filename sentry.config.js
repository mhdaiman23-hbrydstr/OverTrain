import * as Sentry from "@sentry/nextjs";

Sentry.init({
  // Get this from your Sentry project dashboard
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Production-only by default
  enabled: process.env.NODE_ENV === 'production',

  // Environment tracking
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,

  // Capture 100% of errors
  integrations: [
    Sentry.replayIntegration({
      // Mask sensitive data in session replay
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // For performance monitoring (10% of transactions in production)
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Capture 100% of errors, but only 10% of successful transactions
  // This helps control costs while catching all errors
  profilesSampleRate: 1.0,

  // Replay sampling
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,
  replaysOnErrorSampleRate: 1.0,

  // Ignore certain errors that are not useful
  ignoreErrors: [
    // Browser extensions
    'chrome-extension://',
    'moz-extension://',
    // Network errors that are expected
    'NetworkError',
    'TimeoutError',
  ],

  beforeSend(event, hint) {
    // Filter out errors that shouldn't be sent to Sentry
    if (event.exception) {
      const error = hint.originalException;

      // Don't send user-triggered cancellations
      if (error?.message?.includes('cancel')) {
        return null;
      }
    }

    return event;
  },
});

export const captureException = Sentry.captureException;
export const captureMessage = Sentry.captureMessage;
  // Route client requests through Next.js to avoid ad blockers
  tunnel: "/monitoring",
