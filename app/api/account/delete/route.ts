import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Account deletion requires authentication and should not be static
export const dynamic = 'force-dynamic'

/**
 * DELETE /api/account/delete
 *
 * Permanently deletes the authenticated user's account and all associated data.
 * This action cannot be undone.
 *
 * Required: Valid authentication session
 *
 * Returns:
 * - 200: Account successfully deleted
 * - 401: Not authenticated
 * - 500: Server error during deletion
 */
export async function DELETE(req: NextRequest) {
  try {
    // Get user session from Supabase client (with anon key)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[Account Delete] Supabase not configured')
      return NextResponse.json(
        { error: 'Authentication service not configured' },
        { status: 500 }
      )
    }

    // Create client to verify user session
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Get session from request
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('[Account Delete] No authorization header')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.error('[Account Delete] Invalid session:', authError)
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      )
    }

    const userId = user.id
    const userEmail = user.email

    console.log('[Account Delete] Deleting account for user:', userEmail)

    // Log audit event BEFORE deletion (so we still have the user)
    try {
      const { logAuditEvent } = await import('@/lib/audit-logger')
      await logAuditEvent({
        action: 'ACCOUNT_DELETED',
        userId: userId,
        details: { email: userEmail, deletedAt: new Date().toISOString() },
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
        userAgent: req.headers.get('user-agent') || null,
      })
    } catch (auditError) {
      console.error('[Account Delete] Failed to log audit event:', auditError)
      // Don't block deletion if audit logging fails
    }

    // Use service role key to delete user from auth.users
    // This bypasses RLS and triggers CASCADE DELETE for all user data
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!serviceRoleKey) {
      console.error('[Account Delete] Service role key not configured')
      return NextResponse.json(
        { error: 'Account deletion service not configured' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Delete user from auth.users (CASCADE will delete all related data)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteError) {
      console.error('[Account Delete] Failed to delete user:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete account', detail: deleteError.message },
        { status: 500 }
      )
    }

    console.log('[Account Delete] Successfully deleted account:', userEmail)

    return NextResponse.json({
      success: true,
      message: 'Account successfully deleted. All your data has been permanently removed.',
    })

  } catch (error: any) {
    console.error('[Account Delete] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Failed to delete account', detail: String(error?.message || error) },
      { status: 500 }
    )
  }
}
