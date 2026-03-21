"use client"

import React from "react"

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo)

    // Report to Sentry if available
    try {
      const Sentry = require("@sentry/nextjs")
      Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } })
    } catch {
      // Sentry not available, already logged to console
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  handleClearAndRetry = () => {
    try {
      // Clear potentially corrupted data
      const keysToPreserve = ["liftlog-supabase-auth", "liftlog_user"]
      const preserved: Record<string, string | null> = {}

      for (const key of keysToPreserve) {
        preserved[key] = localStorage.getItem(key)
      }

      // Clear all liftlog keys
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith("liftlog_") && !keysToPreserve.includes(key)) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key))

      // Restore preserved keys
      for (const [key, value] of Object.entries(preserved)) {
        if (value) localStorage.setItem(key, value)
      }
    } catch {
      // localStorage might not be available
    }

    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            backgroundColor: "#0a0a0a",
            color: "#ffffff",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <div style={{ maxWidth: "400px", textAlign: "center" }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.5rem" }}>
              Something went wrong
            </h1>
            <p style={{ color: "#999", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
              The app encountered an unexpected error. Your workout data is safe.
            </p>

            {this.state.error && (
              <p
                style={{
                  color: "#666",
                  fontSize: "0.75rem",
                  marginBottom: "1.5rem",
                  padding: "0.75rem",
                  backgroundColor: "#1a1a1a",
                  borderRadius: "0.5rem",
                  wordBreak: "break-word",
                }}
              >
                {this.state.error.message}
              </p>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <button
                onClick={this.handleRetry}
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "#3b82f6",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "0.5rem",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Try Again
              </button>
              <button
                onClick={this.handleClearAndRetry}
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "transparent",
                  color: "#999",
                  border: "1px solid #333",
                  borderRadius: "0.5rem",
                  fontSize: "0.875rem",
                  cursor: "pointer",
                }}
              >
                Clear Cache & Reload
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
