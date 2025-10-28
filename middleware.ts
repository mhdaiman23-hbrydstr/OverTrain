import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware for Sentry integration
 *
 * This runs on every request and helps with:
 * - Capturing request/response metadata
 * - User tracking
 * - Request performance monitoring
 *
 * See: https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */
export function middleware(request: NextRequest) {
  // Add request ID for correlation in logs
  const requestId = crypto.randomUUID();

  const response = NextResponse.next();
  response.headers.set("x-request-id", requestId);

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
