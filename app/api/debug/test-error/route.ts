import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";

// Required for static export (native builds)
export const dynamic = 'force-static';

/**
 * Test endpoint for triggering errors in Sentry
 *
 * Development only - Sentry will only log in production
 *
 * Usage:
 * - GET /api/debug/test-error?type=client   # Test client-side error
 * - GET /api/debug/test-error?type=server   # Test server-side error
 * - GET /api/debug/test-error?type=message  # Test message log
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get("type") || "client";

  try {
    switch (type) {
      case "client": {
        // This would be caught on the client side
        // For testing, we'll throw it here
        throw new Error(
          "Test client-side error - This is from /api/debug/test-error"
        );
      }

      case "server": {
        // Server-side error
        throw new Error("Test server-side error - Database connection failed");
      }

      case "message": {
        // Log a message to Sentry (info level)
        Sentry.captureMessage(
          "Test message from /api/debug/test-error",
          "info"
        );
        return NextResponse.json({
          success: true,
          message: "Logged info message to Sentry",
        });
      }

      case "warning": {
        // Log a warning
        Sentry.captureMessage(
          "Test warning from /api/debug/test-error",
          "warning"
        );
        return NextResponse.json({
          success: true,
          message: "Logged warning to Sentry",
        });
      }

      default:
        return NextResponse.json(
          {
            error: "Unknown error type",
            available: ["client", "server", "message", "warning"],
          },
          { status: 400 }
        );
    }
  } catch (error) {
    // Capture the error in Sentry and flush so we can surface the event ID in dev
    const eventId = Sentry.captureException(error, {
      tags: {
        endpoint: "/api/debug/test-error",
        type,
      },
      extra: {
        timestamp: new Date().toISOString(),
      },
    });
    await Sentry.flush(2000);

    // Return error response
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown error occurred",
        type,
        sentryEnabled: true,
        eventId,
      },
      { status: 500 }
    );
  }
}
