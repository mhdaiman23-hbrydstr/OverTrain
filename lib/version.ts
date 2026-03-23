/**
 * App Version
 * Single source of truth for application version number
 */

// Read from package.json at build time
// This will be replaced by the actual version during build
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.2'

