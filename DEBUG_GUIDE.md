# Debug Mode Guide

## Overview

LiftLog includes a built-in debug system to control console logging without modifying code.

## Quick Start

### Enable Debug Logging

Open the browser console and run:

```javascript
window.LL.setDebug(true)
```

All debug logs will now be visible in the console.

### Disable Debug Logging

```javascript
window.LL.setDebug(false)
```

Debug logs will be hidden (console.error will still show).

### Check Debug Status

```javascript
window.LL.getDebug()
// Returns: true or false
```

## Available Debug Functions

### debugLog(module, ...args)

Conditional logging that only shows when debug is enabled:

```typescript
import { debugLog } from '@/lib/dev-tools'

debugLog('ProgramState', 'Loading template:', templateId)
// Output (when debug enabled): [ProgramState] Loading template: some-id
```

### debugWarn(module, ...args)

Conditional warnings:

```typescript
import { debugWarn } from '@/lib/dev-tools'

debugWarn('WorkoutLogger', 'Set validation failed')
// Output (when debug enabled): [WorkoutLogger] Set validation failed
```

### debugError(module, ...args)

Always logs (errors should always be visible):

```typescript
import { debugError } from '@/lib/dev-tools'

debugError('API', 'Failed to fetch template:', error)
// Output (always): [API] Failed to fetch template: Error(...)
```

## Other Development Tools

### Clear Local Cache

```javascript
window.LL.clearLocal()
// Clears all LiftLog data from localStorage
```

### Clear Cache for Specific User

```javascript
window.LL.clearLocalForUser('user-id-here')
```

### Get localStorage Info

```javascript
window.LL.getLocalStorageInfo()
// Returns: { keys: [...], liftLogKeys: [...] }
```

### Get Cache Size Info

```javascript
window.LL.getCacheInfo()
// Returns: { totalSize: 125, liftLogSize: 42 } (in KB)
```

## Implementation Notes

- Debug mode is **OFF by default** to reduce console noise
- Debug state persists only for the current session (resets on page reload)
- `console.error()` and `console.warn()` for critical issues should NOT use debug functions
- Debug functions are tree-shakeable in production builds

## Migration from console.log

If you're updating existing code to use the debug system:

### Before:
```typescript
console.log('[ProgramState] Loading template:', templateId)
```

### After:
```typescript
import { debugLog } from '@/lib/dev-tools'

debugLog('ProgramState', 'Loading template:', templateId)
```

## Files with Heavy Logging

The following files have high console.log counts and would benefit most from debug functions:

1. **components/workout-logger/hooks/use-workout-session.ts** (57 logs)
2. **lib/program-state.ts** (31 logs)
3. **components/train-section.tsx** (13 logs)
4. **app/page.tsx** (10 logs)
5. **lib/workout-logger.ts** (25+ logs)

## Best Practices

1. **Use debug functions for verbose logging:**
   - State changes
   - Data transformations
   - API responses (success)

2. **Use console.error() directly for:**
   - Exceptions
   - API failures
   - Data corruption

3. **Use console.warn() directly for:**
   - Deprecated features
   - Missing data (non-critical)
   - Performance warnings

4. **Module names should be consistent:**
   - Use component/file name: `'WorkoutLogger'`, `'ProgramState'`
   - Keep it short and descriptive

## Example Session

```javascript
// 1. Enable debug mode
window.LL.setDebug(true)

// 2. Perform actions (logs will now be visible)
// ... navigate to workout page, etc.

// 3. Check cache size
window.LL.getCacheInfo()
// { totalSize: 245, liftLogSize: 189 }

// 4. Disable debug mode when done
window.LL.setDebug(false)

// 5. Clear cache if needed
window.LL.clearLocal()
```

## TypeScript Support

All debug functions are fully typed. Import them from `@/lib/dev-tools`:

```typescript
import {
  isDebugEnabled,
  debugLog,
  debugWarn,
  debugError
} from '@/lib/dev-tools'
```

## Environment-Specific Behavior

- **Development:** Tools available via `window.LL`
- **Production:** Tools still available (for debugging production issues)
- Debug mode: **Always OFF by default** (no auto-enable in dev)

---

**Last Updated:** October 12, 2025
