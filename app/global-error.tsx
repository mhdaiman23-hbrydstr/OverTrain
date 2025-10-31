"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset?: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: {
        type: "global_error",
        digest: error.digest,
      },
      contexts: {
        react: {
          component_stack: error.stack,
        },
      },
    })
  }, [error])

  const handleReset = () => {
    if (typeof reset === "function") {
      reset()
    } else if (typeof window !== "undefined") {
      window.location.reload()
    }
  }

  return (
    <html>
      <body>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            minHeight: "100vh",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f3f4f6",
            padding: "20px",
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              padding: "40px",
              maxWidth: "600px",
              textAlign: "center",
            }}
          >
            <h1
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                marginBottom: "16px",
                color: "#1f2937",
              }}
            >
              Something went wrong
            </h1>

            <p
              style={{
                fontSize: "16px",
                color: "#6b7280",
                marginBottom: "24px",
                lineHeight: "1.5",
              }}
            >
              We encountered an unexpected error. Our team has been notified and is working to fix it. Please try again in a moment.
            </p>

            {error.message && (
              <div
                style={{
                  backgroundColor: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: "4px",
                  padding: "16px",
                  marginBottom: "24px",
                  textAlign: "left",
                }}
              >
                <p
                  style={{
                    fontSize: "12px",
                    color: "#9ca3af",
                    margin: "0 0 8px 0",
                    textTransform: "uppercase",
                    fontWeight: "600",
                  }}
                >
                  Error Details
                </p>
                <code
                  style={{
                    fontSize: "13px",
                    color: "#374151",
                    wordBreak: "break-all",
                    display: "block",
                    fontFamily: "monospace",
                  }}
                >
                  {error.message}
                </code>
                {error.digest && (
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#9ca3af",
                      margin: "8px 0 0 0",
                    }}
                  >
                    Error ID: {error.digest}
                  </p>
                )}
              </div>
            )}

            <button
              onClick={handleReset}
              style={{
                backgroundColor: "#22c55e",
                color: "white",
                border: "none",
                borderRadius: "4px",
                padding: "10px 20px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.backgroundColor = "#16a34a"
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.backgroundColor = "#22c55e"
              }}
            >
              Try Again
            </button>
          </div>

          <p
            style={{
              marginTop: "40px",
              fontSize: "14px",
              color: "#9ca3af",
              textAlign: "center",
            }}
          >
            If the problem persists, please {" "}
            <a
              href="mailto:support@liftlog.app"
              style={{
                color: "#22c55e",
                textDecoration: "none",
              }}
            >
              contact support
            </a>
            .
          </p>
        </div>
      </body>
    </html>
  )
}
