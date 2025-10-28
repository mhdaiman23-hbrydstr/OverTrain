import * as Sentry from "@sentry/nextjs";

// Edge runtime (middleware/edge routes) Sentry initialization
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Production-only by default
  enabled: process.env.NODE_ENV === "production",
  debug: false,

  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,

  // Keep sampling modest in prod
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Route via Next.js to bypass ad blockers
  tunnel: "/monitoring",
});

