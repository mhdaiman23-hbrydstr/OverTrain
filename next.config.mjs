import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin/blob/master/src/index.ts#L29

  org: process.env.SENTRY_ORG || "liftlog",
  project: process.env.SENTRY_PROJECT || "liftlog-app",

  // An auth token is required for uploading source maps.
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Suppresses source map uploading logs during build
  silent: true,

  // For CI environments, you can set the following to true
  // to automatically discover and upload source maps.
  widenClientFileUpload: true,

  // Routes browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // Can be disabled if you have a reason to do so
  tunnelRoute: "/monitoring",

  // Hides client-side release information and improves privacy
  hideSourceMaps: true,
});

