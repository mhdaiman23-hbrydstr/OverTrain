# Native App Development Guide

This document provides an overview of the native Android and iOS app development for OverTrain.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Existing Next.js PWA                      │
│                   (unchanged, still works)                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Capacitor Bridge                         │
│              (wraps PWA for native platforms)                │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
     ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
     │   SQLite    │  │   Native    │  │    Push     │
     │   Plugin    │  │  Animations │  │   Notifs    │
     └─────────────┘  └─────────────┘  └─────────────┘
              │
              ▼
     ┌─────────────────────────────────────────┐
     │              Supabase                    │
     │         (cloud source of truth)         │
     └─────────────────────────────────────────┘
```

## Quick Start

### Development

```bash
# Build for native platforms
npm run build:native

# Sync with native projects
npm run cap:sync

# Open Android Studio
npm run cap:android:dev

# Open Xcode
npm run cap:ios:dev
```

### Production Build

```bash
# Android
npm run cap:android

# iOS
npm run cap:ios
```

## Native Services

All native services are in `lib/native/`:

### Platform Detection (`platform.ts`)
- `isNative()` - Check if running in Capacitor
- `isAndroid()` / `isIOS()` - Platform-specific checks
- `platformValue()` - Return different values per platform

### SQLite Database (`sqlite-service.ts`, `sqlite-schema.ts`)
- High-performance local storage
- Mirrors Supabase schema for offline support
- Automatic data migration from IndexedDB

### Unified Storage (`storage-service.ts`)
- Platform-aware storage abstraction
- Routes to SQLite on native, IndexedDB on web
- API compatible with existing StorageManager

### Background Sync (`background-sync.ts`)
- Syncs local SQLite with Supabase
- Handles app foreground/background transitions
- Retry logic for failed operations

### Reminder Scheduler (`reminder-scheduler.ts`)
- Local notifications for workout reminders
- Configurable days and times
- Works offline

### Notification Service (`notification-service.ts`)
- Push notification handling (FCM/APNs)
- Achievement notifications
- Personal record alerts

### Animations (`animations.ts`)
- GPU-accelerated animation utilities
- Haptic feedback helpers
- Spring physics animations

## Animation Hooks

React hooks for animations are in `hooks/use-animations.ts`:

- `useSetCompletionAnimation()` - Set completion with haptics
- `useExpandAnimation()` - Card expand/collapse
- `useInputAnimation()` - Focus states with feedback
- `useStaggerAnimation()` - Staggered list animations
- `useRestTimerAnimation()` - Circular timer animation
- `useButtonPressAnimation()` - Press feedback

## CSS Animations

Animation keyframes and utility classes are defined in `app/globals.css`:

```css
/* Example usage */
.animate-slide-up
.animate-fade-in
.animate-scale-in
.animate-bounce-in
.animate-set-complete
.animate-timer-pulse
.stagger-1 through .stagger-10
```

## Project Structure

```
lib/native/
├── index.ts              # Entry point, exports all services
├── platform.ts           # Platform detection utilities
├── sqlite-schema.ts      # Database schema definitions
├── sqlite-service.ts     # SQLite operations
├── storage-service.ts    # Unified storage abstraction
├── background-sync.ts    # Supabase sync service
├── reminder-scheduler.ts # Local notification scheduling
├── notification-service.ts # Push notification handling
└── animations.ts         # Animation utilities

hooks/
└── use-animations.ts     # React animation hooks

android/                  # Android project (Capacitor)
ios/                      # iOS project (Capacitor)
```

## Configuration Files

- `capacitor.config.ts` - Main Capacitor configuration
- `next.config.native.mjs` - Next.js config for static export
- `android/app/build.gradle` - Android build configuration
- `ios/App/App/Info.plist` - iOS app configuration

## Initializing Native Services

In your app entry point:

```typescript
import { initializeNativeServices } from '@/lib/native';

// Call early in app lifecycle
const { isNative, sqliteAvailable, notificationsEnabled } = 
  await initializeNativeServices();
```

## Store Submission

See the detailed guides:
- [Android Play Store Guide](./ANDROID_PLAY_STORE_GUIDE.md)
- [iOS App Store Guide](./IOS_APP_STORE_GUIDE.md)

## Development Tips

### Testing on Device

```bash
# Android - USB debugging
adb devices
npx cap run android --target <device-id>

# iOS - Select device in Xcode
npx cap open ios
# Then select device and run
```

### Debugging

```bash
# Android logs
adb logcat | grep -i overtrain

# iOS logs
# Use Xcode Console
```

### Hot Reload (Development)

For faster development, use live reload:

1. Start dev server: `npm run dev`
2. Update `capacitor.config.ts`:
   ```typescript
   server: {
     url: 'http://YOUR_IP:3000',
     cleartext: true,
   }
   ```
3. Sync and run: `npx cap sync && npx cap run android`

## Offline Support

The app works fully offline:

1. **SQLite** stores all workout data locally
2. **Background sync** uploads when connected
3. **Sync queue** preserves failed operations
4. **Conflict resolution** uses last-write-wins

## Push Notifications

### Setup Requirements

**Android**:
1. Create Firebase project
2. Download `google-services.json` to `android/app/`
3. Build and test

**iOS**:
1. Configure APNs in Apple Developer Portal
2. Download `.p8` key
3. Upload to Firebase
4. Download `GoogleService-Info.plist` to `ios/App/App/`

### Notification Types

- Workout reminders (scheduled local)
- Personal records (triggered on detection)
- Streak achievements (triggered on completion)
- Program progress (triggered on week completion)

## Performance Optimizations

1. **GPU Acceleration**: All animations use `transform` and `will-change`
2. **Haptic Feedback**: Native haptics for set completion
3. **SQLite Queries**: Indexed for fast lookups
4. **Background Processing**: Sync doesn't block UI
5. **Staggered Animations**: Prevent jank on list renders

## Troubleshooting

### SQLite not working
- Check Capacitor plugin is installed: `npx cap ls`
- Verify plugin in `capacitor.config.ts`

### Push notifications not received
- Verify Firebase/APNs configuration
- Check device permissions
- Test with Firebase Console test message

### Animations janky
- Ensure `gpu-accelerated` class on animated elements
- Reduce animation complexity on low-end devices
- Use `will-change` sparingly

### Sync not completing
- Check network connectivity
- Verify Supabase credentials
- Check console for sync errors

