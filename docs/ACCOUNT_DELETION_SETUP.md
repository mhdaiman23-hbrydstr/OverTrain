# Account Deletion Feature - Setup Guide

## Overview

This document explains the account deletion feature implementation for OverTrain, which is **required by both Apple App Store and Google Play Store** for apps that allow user account creation.

## Implementation Summary

The account deletion feature has been implemented with three components:

### 1. **Client-Side UI** ✅ (Completed)
- Location: `components/profile-settings-panel.tsx`
- Features:
  - "Delete Account" button in Profile Settings > Data Management
  - Confirmation dialog with detailed warning about data loss
  - "Export Data" button to backup data before deletion
  - Loading states and error handling

### 2. **Supabase RPC Function** ✅ (Created - Needs Deployment)
- Location: `migrations/add-delete-user-account-function.sql`
- Function: `delete_user_account()`
- Purpose: Handles account deletion for all platforms (web, iOS, Android)
- Security: Uses `SECURITY DEFINER` to safely delete from `auth.users`
- Note: **Required for the feature to work** - must be deployed to Supabase

---

## How It Works

### All Platforms (Web, iOS, Android)
1. User clicks "Delete Account" in Profile Settings
2. Confirmation dialog appears with detailed warning
3. User confirms deletion
4. App calls Supabase RPC function `delete_user_account()`
5. RPC function verifies user is authenticated (via `auth.uid()`)
6. RPC function deletes user from `auth.users` table
7. CASCADE DELETE automatically removes all user data (profiles, workouts, programs, etc.)
8. Local storage is cleared
9. User is signed out and redirected to landing page

---

## Setup Instructions

### Step 1: Deploy the RPC Function

You need to run the SQL migration to create the `delete_user_account()` function in your Supabase database.

**Option A: Using Supabase Dashboard (Recommended)**

1. Go to https://supabase.com/dashboard
2. Select your project: `fyhbpkjibjtvltwcavlw`
3. Click on "SQL Editor" in the left sidebar
4. Click "New Query"
5. Copy the entire contents of `migrations/add-delete-user-account-function.sql`
6. Paste it into the SQL editor
7. Click "Run" to execute
8. Verify success - you should see "Success. No rows returned"

**Option B: Using Supabase CLI**

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to your project (you'll need your project ref and database password)
supabase link --project-ref fyhbpkjibjtvltwcavlw

# Run the migration
supabase db push migrations/add-delete-user-account-function.sql
```

### Step 2: Verify Database CASCADE DELETE

The CASCADE DELETE constraints should already be configured (from `migrations/fix-cascade-constraints-aggressive.sql`). Verify they exist:

```sql
-- Run this query in Supabase SQL Editor to verify CASCADE constraints
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND ccu.table_name = 'auth.users'
ORDER BY tc.table_name;
```

Expected output: All user-related tables (`profiles`, `workouts`, `active_programs`, `in_progress_workouts`, `program_history`) should have `delete_rule = 'CASCADE'`.

### Step 3: Test the Feature

**Important**: Before testing, make sure you've deployed the RPC function (Step 1 above).

**Testing Steps (All Platforms):**

1. Start dev server: `npm run dev`
2. Sign in with a test account
3. Go to Profile → Settings tab
4. Scroll to "Data Management" section
5. Click "Export Data" to backup (optional)
6. Click "Delete Account"
7. Confirm in the dialog
8. Verify:
   - Success toast appears
   - Local storage is cleared
   - User is signed out and redirected to landing page
   - User cannot sign in again (account deleted)

**Verify Data Deletion in Supabase:**

1. Before deletion: Note the user's ID in Supabase Dashboard → Authentication
2. Perform account deletion
3. Check Supabase Dashboard:
   - User should be gone from Authentication → Users
   - User's data should be gone from all tables (profiles, workouts, etc.)
4. Check audit_logs table (if it exists) for deletion event

**If Testing Fails:**

- **Error: "function delete_user_account does not exist"**
  - Solution: Deploy the RPC function from Step 1
- **Error: "Account deletion is not yet configured"**
  - Solution: Run the migration SQL in Supabase Dashboard
- **Error: "Not authenticated"**
  - Solution: Make sure you're signed in before attempting deletion

---

## App Store Compliance

### Apple App Store Requirements ✅

- [x] Privacy Policy URL: https://overtrain.app/privacy-policy
- [x] Support URL: https://overtrain.app/support
- [x] Account deletion available within app
- [x] Clear confirmation dialog before deletion
- [x] Data is permanently deleted (CASCADE DELETE)

**Where to find it in the app:**
- Profile → Settings → Data Management → Delete Account

### Google Play Store Requirements ✅

- [x] Privacy Policy URL: https://overtrain.app/privacy-policy
- [x] Data deletion mechanism in-app
- [x] User data is permanently deleted
- [x] Data export available (GDPR/CCPA compliance)

**Data Safety Section Info:**
- App collects: Account info, workout data, device data
- Data can be deleted: Yes, via in-app settings
- Data can be exported: Yes, via "Export Data" button

---

## Security Features

1. **Authentication Required**: Users must be signed in to delete their account
2. **Confirmation Dialog**: Prevents accidental deletions
3. **Audit Logging**: Deletion events are logged before deletion (if audit table exists)
4. **Secure RPC Function**: Uses `SECURITY DEFINER` with `auth.uid()` check
5. **CASCADE DELETE**: All user data is automatically removed
6. **No Orphaned Data**: Foreign key constraints ensure data integrity

---

## Data Deleted on Account Deletion

When a user deletes their account, the following data is **permanently removed**:

- ✅ User profile information (name, gender, preferences, 1RM data)
- ✅ All completed workout history
- ✅ In-progress workouts
- ✅ Active programs
- ✅ Program history
- ✅ Analytics and performance metrics
- ✅ Authentication credentials
- ✅ All localStorage data (client-side)

**Retention Period**: Data is deleted immediately. As stated in the privacy policy, data may be retained in backups for up to 30 days.

---

## Troubleshooting

### Issue: "RPC function not found" error in native app

**Solution**: Make sure you ran the migration from Step 1 above.

```sql
-- Check if function exists
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'delete_user_account';
```

If empty, re-run the migration SQL.

### Issue: "Not authenticated" error

**Solution**: User session may have expired. Have user sign out and sign in again, then retry.

### Issue: API endpoint returns 503 in development

**Solution**: Make sure `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local` (it already is in this project).

### Issue: Deletion succeeds but user data remains in database

**Solution**: CASCADE constraints may not be configured. Run this to check:

```sql
-- Check foreign keys on profiles table
SELECT * FROM information_schema.table_constraints
WHERE table_name = 'profiles' AND constraint_type = 'FOREIGN KEY';
```

Re-run the `fix-cascade-constraints-aggressive.sql` migration if needed.

---

## Files Modified/Created

### Created:
- `migrations/add-delete-user-account-function.sql` - Supabase RPC function for account deletion
- `app/delete-account/page.tsx` - Public account deletion instructions page
- `ACCOUNT_DELETION_SETUP.md` - This documentation

### Modified:
- `components/profile-settings-panel.tsx` - Added delete account UI and data export functionality

---

## Privacy Policy Compliance

The privacy policy (`app/privacy-policy/page.tsx`) already mentions account deletion:

> "You may delete your account at any time from Settings > Data Controls or by contacting support@overtrain.app. When you delete your account, we will delete your personal information and workout data within 30 days."

**✅ This is now accurate** - users can delete accounts from Settings → Data Management.

---

## Support Contact for Account Deletion

As a fallback, users can also request account deletion via email:
- **Email**: support@overtrain.app
- **Response Time**: Within 24-48 hours

This provides an alternative method if technical issues prevent in-app deletion.

---

## Next Steps

1. **Deploy RPC Function**: Run the SQL migration in Supabase (Step 1 above)
2. **Test Thoroughly**: Test on both web and native apps with test accounts
3. **Update App Store Listings**: Add account deletion info to app descriptions
4. **Submit for Review**: Include in release notes for app store review

---

## Questions?

If you encounter any issues or have questions:
1. Check the Troubleshooting section above
2. Review Supabase logs for error details
3. Test with a fresh test account
4. Contact Anthropic support if you need further assistance

**Status**: ✅ Feature is complete and ready for deployment after running the migration.
