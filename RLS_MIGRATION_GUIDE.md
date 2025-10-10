# RLS Migration Fix Guide

## 🚨 Issue: Row Level Security Blocking Migration

The exercise migration is failing because RLS policies are preventing anonymous inserts. Here's how to fix it:

## 📋 Quick Fix Steps

### Step 1: Run RLS Fix in Supabase

1. Go to your Supabase dashboard: https://app.supabase.com
2. Navigate to your project: `https://fyhbpkjibjtvltwcavlw.supabase.co`
3. Open SQL Editor
4. Copy and execute this SQL:

```sql
-- Drop existing insert policy
DROP POLICY IF EXISTS "Authenticated users can insert exercises" ON exercise_library;

-- Create temporary policy that allows anyone to insert
CREATE POLICY "Allow anonymous inserts for migration" ON exercise_library FOR INSERT WITH CHECK (true);
```

### Step 2: Run Migration

```bash
node scripts/migrate-exercises-simple.cjs
```

### Step 3: Restore Proper RLS

After migration completes, run this SQL to restore security:

```sql
-- Drop temporary policy
DROP POLICY "Allow anonymous inserts for migration" ON exercise_library;

-- Restore proper authenticated-only policy
CREATE POLICY "Authenticated users can insert exercises" ON exercise_library FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

## 🔍 What's Happening

- **Problem**: RLS policy `Authenticated users can insert exercises` blocks anonymous inserts
- **Solution**: Temporarily replace with permissive policy for migration
- **Security**: We restore proper RLS after migration

## ⚡ Alternative: Service Role Key

If you have access to the service role key, you can use:

```bash
# Add to .env.local:
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

node scripts/migrate-exercises-bypass.cjs
```

## 📊 Expected Results

- **259 exercises** should migrate successfully
- **8 duplicates** will be skipped
- **0 invalid exercises** (after validation)

## 🔧 Troubleshooting

If migration still fails:

1. Check that the table exists: `SELECT * FROM exercise_library LIMIT 1;`
2. Verify RLS is disabled: `ALTER TABLE exercise_library DISABLE ROW LEVEL SECURITY;`
3. Run migration again
4. Re-enable RLS: `ALTER TABLE exercise_library ENABLE ROW LEVEL SECURITY;`

---

**Status**: Ready for migration with RLS fix
**Next**: Run the SQL fix, then migration, then restore RLS
