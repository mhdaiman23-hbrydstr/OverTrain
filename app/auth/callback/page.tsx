'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('[Auth Callback] Processing OAuth callback...')

        // Get the code from URL parameters
        const code = searchParams.get('code')
        const error_description = searchParams.get('error_description')

        if (error_description) {
          console.error('[Auth Callback] Error from OAuth provider:', error_description)
          setError(`Authentication failed: ${error_description}`)
          setLoading(false)
          return
        }

        if (!code) {
          console.warn('[Auth Callback] No code in URL, checking for existing session...')
          // Check if there's already a session (user might already be logged in)
          const { data: { session } } = await supabase.auth.getSession()

          if (session) {
            console.log('[Auth Callback] Session found, redirecting to dashboard...')
            router.push('/')
            return
          }

          setError('Authentication failed: No authorization code received')
          setLoading(false)
          return
        }

        console.log('[Auth Callback] Exchanging code for session...')

        // Exchange code for session
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

        if (exchangeError) {
          console.error('[Auth Callback] Error exchanging code:', exchangeError)
          setError(`Failed to exchange code: ${exchangeError.message}`)
          setLoading(false)
          return
        }

        if (!data.session) {
          console.error('[Auth Callback] No session returned from exchange')
          setError('Authentication failed: No session returned')
          setLoading(false)
          return
        }

        console.log('[Auth Callback] Session established successfully:', data.session.user.email)
        console.log('[Auth Callback] Redirecting to dashboard...')

        // Redirect to dashboard
        router.push('/')
      } catch (err) {
        console.error('[Auth Callback] Unexpected error:', err)
        setError(err instanceof Error ? err.message : 'An unexpected error occurred')
        setLoading(false)
      }
    }

    handleCallback()
  }, [searchParams, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Completing authentication...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-md">
          <p className="text-red-500 font-medium">Authentication Error</p>
          <p className="text-muted-foreground">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Return to Login
          </button>
        </div>
      </div>
    )
  }

  return null
}
