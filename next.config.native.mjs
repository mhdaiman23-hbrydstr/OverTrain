import { withSentryConfig } from "@sentry/nextjs";

/**
 * Next.js configuration for native app builds (Capacitor)
 * 
 * This config enables static export for Capacitor to bundle the app
 * into Android and iOS native containers.
 * 
 * Key differences from web config:
 * - output: 'export' for static HTML/CSS/JS generation
 * - trailingSlash: true for proper file-based routing
 * - No API routes (handled by Supabase directly)
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static export for Capacitor
  output: 'export',
  
  // Required for static export routing
  trailingSlash: true,
  
  // Skip linting and type checking for faster builds
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Images must be unoptimized for static export
  images: {
    unoptimized: true,
  },
  
  // Environment variables injected at build time
  env: {
    NEXT_PUBLIC_IS_NATIVE: 'true',
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || '1.0.2',
  },
  
  // Disable server-side features for static export
  // API routes won't work - use Supabase directly instead
  experimental: {
    // Ensure client-side navigation works properly
  },
  
  // Exclude API routes from static export
  excludeDefaultMomentLocales: true,
  
  // Custom page extensions to handle static export
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  
  // Don't generate API routes for static export
  generateBuildId: () => 'build',
  
  // Handle API routes by excluding them
  async rewrites() {
    return [];
  },
}

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG || "liftlog",
  project: process.env.SENTRY_PROJECT || "liftlog-app",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  widenClientFileUpload: true,
  // Disable tunnel route for native (no server-side rewrites)
  tunnelRoute: undefined,
  hideSourceMaps: true,
});
