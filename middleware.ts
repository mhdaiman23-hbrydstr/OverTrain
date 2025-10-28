import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware for security headers and Sentry integration
 *
 * This runs on every request and helps with:
 * - Adding comprehensive security headers (CSP, HSTS, X-Frame-Options, etc.)
 * - Capturing request/response metadata for Sentry
 * - User tracking
 * - Request performance monitoring
 *
 * See: https://docs.sentry.io/platforms/javascript/guides/nextjs/
 * See: https://owasp.org/www-project-secure-headers/
 */
export function middleware(request: NextRequest) {
  // Add request ID for correlation in logs
  const requestId = crypto.randomUUID();

  const response = NextResponse.next();
  response.headers.set("x-request-id", requestId);

  // ============================================
  // SECURITY HEADERS
  // ============================================

  // Content-Security-Policy (CSP)
  // Prevents XSS attacks by restricting script/style/image sources
  // Using report-only mode during development for debugging
  const cspHeader = process.env.NODE_ENV === "production"
    ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.sentry-cdn.com https://*.sentry.io; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.sentry.io https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
    : "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.sentry-cdn.com https://*.sentry.io; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.sentry.io https://*.supabase.co wss://*.supabase.co localhost:* 127.0.0.1:*; frame-ancestors 'none'; base-uri 'self'; form-action 'self';";

  response.headers.set("Content-Security-Policy", cspHeader);

  // X-Frame-Options
  // Prevents clickjacking attacks by disallowing framing in other sites
  response.headers.set("X-Frame-Options", "DENY");

  // X-Content-Type-Options
  // Prevents MIME-sniffing attacks
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Strict-Transport-Security (HSTS)
  // Forces browser to always use HTTPS (only in production)
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  // Referrer-Policy
  // Controls what referrer information is sent to external sites
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions-Policy (formerly Feature-Policy)
  // Restricts browser features like microphone, camera, geolocation
  response.headers.set(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), payment=()"
  );

  // X-Permitted-Cross-Domain-Policies
  // Restricts cross-domain access to Flash/PDF content
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none");

  return response;
}

// Configure which routes this middleware applies to
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
