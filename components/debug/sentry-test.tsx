'use client';

import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Sentry Test Component
 *
 * DEVELOPMENT ONLY - Shows buttons to trigger various errors
 * This helps test how Sentry captures and logs errors
 *
 * Only visible in development mode (NODE_ENV=development)
 */
export function SentryTestComponent() {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const handleClientError = () => {
    throw new Error(
      "This is a test client-side error from SentryTestComponent"
    );
  };

  const handleServerError = async () => {
    try {
      const response = await fetch("/api/debug/test-error?type=server");
      if (!response.ok) {
        throw new Error("Server error triggered");
      }
    } catch (error) {
      Sentry.captureException(error);
      console.error("Server error caught:", error);
    }
  };

  const handleMessage = async () => {
    Sentry.captureMessage("Test info message from browser", "info");
    alert("Message sent to Sentry - check dashboard");
  };

  const handleWarning = async () => {
    Sentry.captureMessage("Test warning from browser", "warning");
    alert("Warning sent to Sentry - check dashboard");
  };

  const handleConsoleLog = () => {
        console.warn("This console.warn stays in browser console");
    console.error("This console.error might be sent to Sentry");
  };

  return (
    <Card className="mt-4 border-yellow-500 bg-yellow-50">
      <CardHeader>
        <CardTitle className="text-yellow-900">🔍 Sentry Test Panel</CardTitle>
        <CardDescription className="text-yellow-700">
          Development only - Test error tracking and console log capture
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-yellow-900">Client-Side Errors:</p>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleClientError}
              variant="destructive"
              size="sm"
            >
              Throw Error (Client)
            </Button>
            <Button
              onClick={handleServerError}
              variant="destructive"
              size="sm"
            >
              Throw Error (Server)
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-yellow-900">Messages:</p>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleMessage}
              variant="outline"
              size="sm"
            >
              Log Info Message
            </Button>
            <Button
              onClick={handleWarning}
              variant="outline"
              size="sm"
            >
              Log Warning
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-yellow-900">Console Logs:</p>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleConsoleLog}
              variant="secondary"
              size="sm"
            >
              Log to Console (Check DevTools)
            </Button>
          </div>
        </div>

        <div className="mt-4 space-y-2 border-t pt-4">
          <p className="text-xs text-yellow-800">
            <strong>How it works:</strong>
          </p>
          <ul className="text-xs text-yellow-800 space-y-1">
            <li>• <strong>Client Errors</strong> - Captured by Sentry in production</li>
            <li>• <strong>Server Errors</strong> - Captured server-side</li>
            <li>• <strong>Messages</strong> - Info/warning logs (not errors)</li>
            <li>• <strong>Console Logs</strong> - Visible in browser DevTools, NOT sent to Sentry</li>
            <li>• Check your Sentry dashboard to see captured errors</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
