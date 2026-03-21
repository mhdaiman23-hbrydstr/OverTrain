---
name: pre-push-gate
description: Run before pushing to main. Validates build, tests, lint, TypeScript, and reviews changed files for regressions, security issues, and data integrity. Use this skill before any push to main or when the user asks to verify code quality.
---

# Pre-Push Quality Gate

Run this comprehensive quality gate before pushing to `main`. It catches build failures, test regressions, type errors, and common bugs before they reach production.

## Checklist

Execute each step in order. Stop at the first failure and report it to the user.

### Step 1: Run Tests
```bash
npm run test -- --run
```
All tests must pass. If any fail, report which tests failed and why.

### Step 2: TypeScript Type Check
```bash
npx tsc --noEmit --pretty 2>&1 | head -50
```
Report any type errors. Note: some pre-existing errors may be acceptable — focus on errors in recently changed files.

### Step 3: ESLint
```bash
npm run lint 2>&1 | tail -30
```
Report any new lint errors in changed files.

### Step 4: Production Build Check
```bash
npm run build 2>&1 | tail -30
```
The build must succeed. If it fails, report the error.

### Step 5: Review Changed Files
Run `git diff --name-only HEAD~1` (or appropriate range) to identify changed files. For each changed file, review for:

1. **Security**: No hardcoded secrets, API keys, or credentials
2. **Data integrity**: Workout/program state changes use async methods on native (not sync-only)
3. **Storage safety**: No raw `localStorage.setItem` without `StorageLock` for critical keys
4. **Error handling**: All Supabase calls have error handling
5. **Mobile compatibility**: No `window.` access without `typeof window !== 'undefined'` guard
6. **Import paths**: All imports use `@/` alias (not relative `../../`)

### Step 6: Native Build Compatibility
Check that no API route imports leak into client components:
```bash
grep -r "from.*app/api" --include="*.tsx" --include="*.ts" components/ lib/ 2>/dev/null | grep -v node_modules | grep -v ".test." | head -10
```
Client components must NOT import from `app/api/` routes.

### Step 7: Summary Report
Output a summary:
```
## Pre-Push Quality Gate Results

- Tests: ✅ X passed / ❌ Y failed
- TypeScript: ✅ Clean / ⚠️ N errors (M in changed files)
- Lint: ✅ Clean / ⚠️ N warnings
- Build: ✅ Success / ❌ Failed
- Security: ✅ No issues / ❌ Found issues
- Data Integrity: ✅ Clean / ⚠️ Review needed
- Native Compat: ✅ Clean / ❌ API route leaks found

Recommendation: PUSH / DO NOT PUSH
```

If all checks pass, the recommendation is PUSH. If any critical check fails (tests, build, security), recommend DO NOT PUSH and explain what needs fixing.
