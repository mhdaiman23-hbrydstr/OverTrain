"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { AuthService } from "@/lib/auth"

function parseHash(hash: string) {
  const query = new URLSearchParams(hash.replace(/^#/, ""))
  const access_token = query.get("access_token") || undefined
  const refresh_token = query.get("refresh_token") || undefined
  const type = query.get("type") || undefined
  return { access_token, refresh_token, type }
}

export default function ResetPasswordPage() {
  const [status, setStatus] = useState<"checking" | "ready" | "success" | "error">("checking")
  const [message, setMessage] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const origin = useMemo(() => (typeof window !== "undefined" ? window.location.origin : ""), [])

  useEffect(() => {
    let mounted = true
    const run = async () => {
      if (!supabase) {
        if (!mounted) return
        setStatus("error")
        setMessage("Authentication service is not configured. Please set Supabase env vars.")
        return
      }

      try {
        const url = new URL(window.location.href)
        const code = url.searchParams.get("code")

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
          // Clean the URL
          window.history.replaceState({}, "", `${origin}/auth/reset-password`)
          if (!mounted) return
          setStatus("ready")
          return
        }

        // Handle older hash-based recovery links
        if (window.location.hash) {
          const { access_token, refresh_token, type } = parseHash(window.location.hash)
          if (type === "recovery" && access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({ access_token, refresh_token })
            if (error) throw error
            window.history.replaceState({}, "", `${origin}/auth/reset-password`)
            if (!mounted) return
            setStatus("ready")
            return
          }
        }

        // Fallback: if we already have a session, allow password update
        const { data } = await supabase.auth.getSession()
        if (data.session) {
          if (!mounted) return
          setStatus("ready")
          return
        }

        throw new Error("Invalid or expired password reset link. Request a new one.")
      } catch (err) {
        if (!mounted) return
        setStatus("error")
        setMessage(err instanceof Error ? err.message : "Failed to verify reset link.")
      }
    }

    run()
    return () => {
      mounted = false
    }
  }, [origin])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (password.length < 6) {
      setMessage("Password must be at least 6 characters")
      return
    }
    if (password !== confirm) {
      setMessage("Passwords do not match")
      return
    }
    try {
      setSubmitting(true)
      setMessage("")
      const result = await AuthService.updatePassword(password)
      setStatus("success")
      setMessage(result.message)
    } catch (err) {
      setStatus("error")
      setMessage(err instanceof Error ? err.message : "Failed to update password")
    } finally {
      setSubmitting(false)
    }
  }

  const disableSubmit = submitting || status === "checking"

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Card className="gradient-card border-border/50 shadow-2xl shadow-primary/10">
          <CardHeader>
            <CardTitle>Reset Password</CardTitle>
            <CardDescription>
              {status === "checking" && "Verifying your reset link..."}
              {status !== "checking" && "Enter a new password to finish resetting your account."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {status === "checking" && (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {(status === "ready" || status === "error" || status === "success") && (
              <>
                {message && (
                  <div className={`mb-4 p-3 text-sm rounded border ${
                    status === "error"
                      ? "bg-red-50 border-red-200 text-red-700"
                      : status === "success"
                      ? "bg-green-50 border-green-200 text-green-700"
                      : "bg-muted/30 border-border text-foreground"
                  }`}>
                    {message}
                  </div>
                )}

                {status !== "success" && (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="password">New Password</Label>
                      <Input
                        id="password"
                        type="password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm">Confirm Password</Label>
                      <Input
                        id="confirm"
                        type="password"
                        autoComplete="new-password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full gradient-primary text-primary-foreground"
                      disabled={disableSubmit}
                    >
                      {submitting ? "Updating..." : "Update Password"}
                    </Button>
                  </form>
                )}

                <div className="mt-6 text-center">
                  <Link href="/" className="text-sm text-primary hover:underline">
                    Back to Sign In
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
