import * as Sentry from "@sentry/nextjs";

// Client-side Sentry initialization for browser errors, performance and Replay
// Next.js automatically loads this file if present
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Production-only by default
  enabled: process.env.NODE_ENV === "production",

  // No debug logs in production
  debug: false,

  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,

  // Reasonable defaults for local verification
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Route requests through Next.js to avoid ad blockers
  tunnel: "/monitoring",

  // Capture replays; v10+ uses the integration factory
  integrations: [
    Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
  ],

  // Configure Replay sampling
  replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 1.0,
  replaysOnErrorSampleRate: 1.0,
});
