# LiftLog - Issue Fixes Guide

## Critical Issues Found

### 1. **406 Errors - Exercise Library Queries** (HIGH PRIORITY)
**Problem**: Supabase returning 406 when querying `exercise_library` with name filters
**Root Cause**: RLS policy conflict or missing anon role permissions

### 2. **401 Errors - Workout Sync** (HIGH PRIORITY)  
**Problem**: Database sync failing with 401/42501 insufficient privilege
**Root Cause**: No valid authentication session (bypassed auth for testing)

### 3. **Missing Favicon** (LOW PRIORITY)
**Problem**: 404 error for `/favicon.ico`

### 4. **Form Accessibility Warnings** (LOW PRIORITY)
**Problem**: Password fields not in forms, missing autocomplete

---

## Fix #1: Exercise Library 406 Errors

### Option A: Fix RLS Policies (Recommended)

The issue is that the RLS policy might need explicit anon access. Update the policy:

```sql
-- Drop existing policy
DROP POLICY IF EXISTS "Anyone can read exercises" ON exercise_library;

-- Recreate with explicit anon access
CREATE POLICY "Public read access to exercises" 
  ON exercise_library 
  FOR SELECT 
  TO public, anon, authenticated
  USING (true);
```

### Option B: Add Fallback to Local Cache

If RLS continues to have issues, implement a graceful fallback in the service.

---

## Fix #2: Authentication 401 Errors

### Option A: Enable Proper Authentication (Recommended)

Instead of bypassing auth, fix the Google OAuth configuration. The error "Couldn't sign you in - This browser or app may not be secure" suggests Playwright's user agent is being blocked.

### Option B: Add Offline-First Graceful Degradation

Enhance the sync queue to handle 401 errors gracefully without logging errors when in "offline mode" or when auth is intentionally bypassed.

---

## Fix #3: Missing Favicon

Simply add a favicon file to the public directory.

---

## Fix #4: Form Accessibility

Wrap auth inputs in proper form elements with autocomplete attributes.

---

## Implementation Files

See the following files for specific code changes:
- `fix-exercise-library-rls-v2.sql` - Database policy fix
- `lib/services/exercise-library-service-fixed.ts` - Service with better error handling
- `contexts/auth-context-fixed.tsx` - Auth with graceful 401 handling
- `app/page-fixed.tsx` - Auth form accessibility fixes

