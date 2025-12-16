import { withSentryConfig } from "@sentry/nextjs";

/**
 * Next.js configuration for web deployment (Vercel)
 * 
 * This config enables server-side rendering and API routes for
 * optimal PWA performance on Vercel.
 * 
 * Key differences from native config:
 * - Standard server-side rendering (SSR)
 * - API routes enabled for full functionality
 * - Optimized images for web performance
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standard server-side rendering for web deployment
  // output: 'export' is NOT set for Vercel
  
  // Standard trailing slash handling for web
  trailingSlash: false,
  
  // Enable strict checking for production builds
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Optimized images for web deployment
  images: {
    domains: [
      'localhost',
      'supabase.co',
      'overtrain.app',
      'www.overtrain.app',
      'images.unsplash.com',
    ],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Environment variable to detect web context
  env: {
    NEXT_PUBLIC_IS_NATIVE: 'false',
  },
  
  // Enable server-side features for web
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "overtrain.app", "www.overtrain.app"],
    },
  },
  
  // Standard page extensions
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  
  // API routes work normally in web deployment
  // No rewrites needed - API routes are handled by Next.js
}

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG || "liftlog",
  project: process.env.SENTRY_PROJECT || "liftlog-app",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  widenClientFileUpload: true,
  // Enable tunnel route for web (server-side rewrites work)
  tunnelRoute: "/__sentry-tunnel",
  hideSourceMaps: false,
});
