/**
 * Sentry Client-Side Instrumentation (Next.js >= 15)
 *
 * Next.js will automatically execute the exported `register()` once on the
 * client. This replaces the older `sentry.client.config.ts` convention which is
 * deprecated (especially with Turbopack).
 */
import * as Sentry from '@sentry/nextjs'

export function register() {
  if (typeof window === 'undefined') return

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Production-only by default
    enabled: process.env.NODE_ENV === 'production',

    debug: false,

    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,

    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Route requests through Next.js to avoid ad blockers
    tunnel: '/monitoring',

    // Client-only integrations
    integrations: [Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true })],

    // Replay sampling
    replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,
    replaysOnErrorSampleRate: 1.0,
  })
}
