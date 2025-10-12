/**
 * Authentication Token Diagnostic Script
 *
 * This script helps diagnose RLS authentication issues by comparing:
 * 1. localStorage user ID (what the app uses)
 * 2. Supabase session user ID (what RLS policies check)
 *
 * Run this in browser console or via npm run test-auth
 */

import { supabase } from '../lib/supabase'

export async function diagnoseAuthToken() {
  console.log('=== Authentication Token Diagnostic ===\n')

  // Step 1: Check localStorage user
  const localStorageUser = typeof window !== 'undefined'
    ? localStorage.getItem('liftlog_user')
    : null

  if (localStorageUser) {
    try {
      const parsedUser = JSON.parse(localStorageUser)
      console.log('✅ localStorage user found:')
      console.log('   ID:', parsedUser.id)
      console.log('   Email:', parsedUser.email)
    } catch (error) {
      console.error('❌ Failed to parse localStorage user:', error)
    }
  } else {
    console.log('❌ No user found in localStorage (liftlog_user key)')
  }

  console.log('\n')

  // Step 2: Check Supabase auth session
  if (!supabase) {
    console.log('❌ Supabase client not configured')
    console.log('   Check your .env.local file for:')
    console.log('   - NEXT_PUBLIC_SUPABASE_URL')
    console.log('   - NEXT_PUBLIC_SUPABASE_ANON_KEY')
    return
  }

  try {
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
      console.error('❌ Error getting Supabase session:', error)
      return
    }

    if (!session) {
      console.log('❌ No active Supabase session')
      console.log('   This means auth.uid() will return NULL in RLS policies')
      console.log('\n   Possible causes:')
      console.log('   1. You never logged in through Supabase (only used localStorage)')
      console.log('   2. Your session expired')
      console.log('   3. Session was cleared/corrupted')
      console.log('\n   Fix: Logout and login again through the app')
      return
    }

    console.log('✅ Active Supabase session found:')
    console.log('   User ID:', session.user.id)
    console.log('   Email:', session.user.email)
    console.log('   Provider:', session.user.app_metadata?.provider || 'email')
    console.log('   Token expires at:', new Date(session.expires_at! * 1000).toLocaleString())
    console.log('   Token present:', !!session.access_token)

    // Check if token is expired
    const now = Math.floor(Date.now() / 1000)
    const expiresAt = session.expires_at || 0
    const timeUntilExpiry = expiresAt - now

    if (timeUntilExpiry <= 0) {
      console.log('\n❌ Session token is EXPIRED')
      console.log('   Fix: Logout and login again')
    } else if (timeUntilExpiry < 300) { // Less than 5 minutes
      console.log('\n⚠️  Session token expires soon (in', timeUntilExpiry, 'seconds)')
    } else {
      console.log('\n✅ Session token is valid')
    }

    // Step 3: Compare IDs
    console.log('\n=== ID Comparison ===')
    if (localStorageUser) {
      try {
        const parsedUser = JSON.parse(localStorageUser)
        if (parsedUser.id === session.user.id) {
          console.log('✅ IDs MATCH - localStorage and Supabase session agree')
        } else {
          console.log('❌ IDs DO NOT MATCH!')
          console.log('   localStorage ID:', parsedUser.id)
          console.log('   Supabase session ID:', session.user.id)
          console.log('\n   This will cause RLS failures!')
          console.log('   Fix: Clear localStorage and login again')
        }
      } catch (error) {
        console.error('❌ Could not compare IDs')
      }
    }

    // Step 4: Test database access
    console.log('\n=== Testing Database Access ===')

    try {
      const { data, error: testError } = await supabase
        .from('workouts')
        .select('count')
        .limit(1)

      if (testError) {
        console.error('❌ Database access FAILED:', testError.message)
        console.log('   Error code:', testError.code)

        if (testError.code === '42501') {
          console.log('\n   This is an RLS policy violation!')
          console.log('   Meaning: The database rejected your request')
          console.log('   Cause: auth.uid() does not match user_id in the data')
        }
      } else {
        console.log('✅ Database access works - RLS policies are functioning')
      }
    } catch (error) {
      console.error('❌ Database access test failed:', error)
    }

    // Step 5: Test write access
    console.log('\n=== Testing Write Access ===')

    const testWorkoutSet = {
      id: `test-${Date.now()}`,
      user_id: session.user.id,
      workout_id: `test-workout-${Date.now()}`,
      exercise_id: 'test-exercise',
      exercise_name: 'Test Exercise',
      set_number: 1,
      reps: 10,
      weight: 135,
      completed: true,
      completed_at: Date.now(),
      week: 1,
      day: 1,
    }

    try {
      const { data, error: writeError } = await supabase
        .from('workout_sets')
        .insert(testWorkoutSet)

      if (writeError) {
        console.error('❌ Write test FAILED:', writeError.message)
        console.log('   Error code:', writeError.code)

        if (writeError.code === '42501') {
          console.log('\n   RLS policy blocked the write!')
          console.log('   This confirms: auth.uid() does not match your user_id')
        }
      } else {
        console.log('✅ Write test succeeded')

        // Clean up test data
        await supabase
          .from('workout_sets')
          .delete()
          .eq('id', testWorkoutSet.id)

        console.log('✅ Test data cleaned up')
      }
    } catch (error) {
      console.error('❌ Write test failed:', error)
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }

  console.log('\n=== End Diagnostic ===')
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).diagnoseAuthToken = diagnoseAuthToken
  console.log('Diagnostic function available as: window.diagnoseAuthToken()')
}
