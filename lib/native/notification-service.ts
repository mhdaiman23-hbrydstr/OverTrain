/**
 * Push Notification Service
 * 
 * Handles push notifications for workout reminders, achievements, and updates.
 * Uses Firebase Cloud Messaging (FCM) for both Android and iOS.
 */

import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { isNative, isPluginAvailable, isAndroid, isIOS } from './platform';
import { supabase } from '../supabase';

/**
 * Notification types
 */
export type NotificationType = 
  | 'workout_reminder'
  | 'achievement'
  | 'personal_record'
  | 'streak'
  | 'program_progress'
  | 'inactivity'
  | 'app_update'
  | 'general';

/**
 * Notification payload
 */
export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  actionUrl?: string;
}

/**
 * Device registration status
 */
export interface RegistrationStatus {
  isRegistered: boolean;
  token: string | null;
  platform: 'android' | 'ios' | 'web' | null;
  lastUpdated: number | null;
}

/**
 * Push Notification Service
 */
class NotificationService {
  private token: string | null = null;
  private isRegistered = false;
  private listeners: Map<string, ((notification: NotificationPayload) => void)[]> = new Map();

  /**
   * Initialize the notification service
   * 
   * Note: Push notifications require Firebase (Android) or APNs (iOS) to be configured.
   * If not configured, we gracefully fall back to local notifications only.
   * 
   * IMPORTANT: We skip push notification registration if Firebase isn't configured
   * because the native plugin throws a fatal exception that crashes the app.
   */
  async initialize(): Promise<boolean> {
    if (!isNative()) {
      console.log('[NotificationService] Not available on web platform');
      return false;
    }

    // Initialize local notifications (always available, doesn't need Firebase)
    try {
      if (isPluginAvailable('LocalNotifications')) {
        const localPermResult = await LocalNotifications.requestPermissions();
        if (localPermResult.display === 'granted') {
          console.log('[NotificationService] Local notifications enabled');
          return true;
        } else {
          console.warn('[NotificationService] Local notifications permission not granted');
        }
      }
    } catch (error) {
      console.warn('[NotificationService] Local notifications unavailable:', error);
    }

    // Try to initialize push notifications (requires Firebase/APNs)
    // This will only work if google-services.json (Android) or APNs certs (iOS) are configured
    if (isPluginAvailable('PushNotifications')) {
      try {
        const permResult = await PushNotifications.requestPermissions();
        if (permResult.receive === 'granted') {
          // Set up listeners first to catch registration events
          this.setupListeners();
          
          // Try to register - this will fail gracefully if Firebase isn't configured
          // Note: The try-catch may not catch native crashes, but with google-services.json
          // properly configured, this should work
          await PushNotifications.register();
          console.log('[NotificationService] Push notifications registered');
        } else {
          console.log('[NotificationService] Push notification permission denied');
        }
      } catch (error: any) {
        // Log the error but don't crash - fall back to local notifications
        const errorMessage = error?.message || String(error);
        if (errorMessage.includes('Firebase') || errorMessage.includes('FirebaseApp')) {
          console.log('[NotificationService] Firebase not configured - using local notifications only');
          console.log('[NotificationService] To enable push: add google-services.json to android/app/');
        } else {
          console.warn('[NotificationService] Push notifications unavailable:', error);
        }
      }
    } else {
      console.log('[NotificationService] PushNotifications plugin not available');
    }

    return true;
  }

  /**
   * Set up notification listeners
   */
  private setupListeners(): void {
    // Registration success
    PushNotifications.addListener('registration', async (token: Token) => {
      console.log('[NotificationService] Registered with token:', token.value);
      this.token = token.value;
      this.isRegistered = true;

      // Store token in Supabase for server-side notifications
      await this.saveTokenToDatabase(token.value);
    });

    // Registration error
    PushNotifications.addListener('registrationError', (error) => {
      console.error('[NotificationService] Registration failed:', error);
      this.isRegistered = false;
    });

    // Push notification received while app is in foreground
    PushNotifications.addListener('pushNotificationReceived', async (notification: PushNotificationSchema) => {
      console.log('[NotificationService] Notification received:', notification);

      // Parse the notification payload
      const payload = this.parseNotificationPayload(notification);

      // Show local notification if app is in foreground
      await this.showLocalNotification(payload);

      // Notify listeners
      this.notifyListeners(payload);
    });

    // Push notification action performed (user tapped on notification)
    PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      console.log('[NotificationService] Notification action:', action);

      const payload = this.parseNotificationPayload(action.notification);
      
      // Handle deep linking
      this.handleNotificationAction(payload);

      // Notify listeners
      this.notifyListeners(payload);
    });
  }

  /**
   * Parse notification into standard payload format
   */
  private parseNotificationPayload(notification: PushNotificationSchema): NotificationPayload {
    const data = notification.data || {};
    
    return {
      type: (data.type as NotificationType) || 'general',
      title: notification.title || 'OverTrain',
      body: notification.body || '',
      data,
      actionUrl: data.actionUrl,
    };
  }

  /**
   * Show a local notification (for foreground handling)
   */
  private async showLocalNotification(payload: NotificationPayload): Promise<void> {
    if (!isPluginAvailable('LocalNotifications')) {
      return;
    }

    await LocalNotifications.schedule({
      notifications: [{
        id: Math.floor(Math.random() * 2147483647),
        title: payload.title,
        body: payload.body,
        smallIcon: 'ic_stat_icon',
        iconColor: '#3b82f6',
        extra: payload.data,
      }],
    });
  }

  /**
   * Handle notification action (deep linking)
   */
  private handleNotificationAction(payload: NotificationPayload): void {
    // This will be handled by the app's navigation system
    // We emit an event that the app can listen to
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('notificationAction', { 
        detail: payload 
      }));
    }
  }

  /**
   * Save device token to Supabase
   */
  private async saveTokenToDatabase(token: string): Promise<void> {
    try {
      if (!supabase) {
        console.warn('[NotificationService] Supabase not available');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('[NotificationService] No user logged in');
        return;
      }

      // Upsert the device token
      const { error } = await supabase
        .from('device_tokens')
        .upsert({
          user_id: user.id,
          token,
          platform: isAndroid() ? 'android' : isIOS() ? 'ios' : 'web',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,token',
        });

      if (error) {
        console.error('[NotificationService] Failed to save token:', error);
      } else {
        console.log('[NotificationService] Token saved to database');
      }
    } catch (error) {
      console.error('[NotificationService] Error saving token:', error);
    }
  }

  /**
   * Get registration status
   */
  getStatus(): RegistrationStatus {
    return {
      isRegistered: this.isRegistered,
      token: this.token,
      platform: isAndroid() ? 'android' : isIOS() ? 'ios' : isNative() ? null : 'web',
      lastUpdated: this.isRegistered ? Date.now() : null,
    };
  }

  /**
   * Subscribe to notifications of a specific type
   */
  subscribe(type: NotificationType | 'all', callback: (notification: NotificationPayload) => void): () => void {
    const key = type;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key)!.push(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(key);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(payload: NotificationPayload): void {
    // Notify type-specific listeners
    const typeListeners = this.listeners.get(payload.type) || [];
    typeListeners.forEach(cb => {
      try {
        cb(payload);
      } catch (error) {
        console.error('[NotificationService] Listener error:', error);
      }
    });

    // Notify 'all' listeners
    const allListeners = this.listeners.get('all') || [];
    allListeners.forEach(cb => {
      try {
        cb(payload);
      } catch (error) {
        console.error('[NotificationService] Listener error:', error);
      }
    });
  }

  /**
   * Remove device token from database (on logout)
   */
  async removeToken(): Promise<void> {
    if (!this.token || !supabase) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('device_tokens')
          .delete()
          .eq('user_id', user.id)
          .eq('token', this.token);
      }
    } catch (error) {
      console.error('[NotificationService] Error removing token:', error);
    }

    this.token = null;
    this.isRegistered = false;
  }

  // ============================================================================
  // ACHIEVEMENT NOTIFICATIONS
  // ============================================================================

  /**
   * Send a personal record notification
   */
  async notifyPersonalRecord(exerciseName: string, weight: number, reps: number): Promise<void> {
    await this.showLocalNotification({
      type: 'personal_record',
      title: '🎉 New Personal Record!',
      body: `${exerciseName}: ${weight}kg x ${reps} reps`,
      data: { exerciseName, weight, reps },
    });
  }

  /**
   * Send a streak notification
   */
  async notifyStreak(days: number): Promise<void> {
    const emoji = days >= 30 ? '🔥' : days >= 7 ? '💪' : '⭐';
    
    await this.showLocalNotification({
      type: 'streak',
      title: `${emoji} ${days}-Day Streak!`,
      body: `You've been consistent for ${days} days. Keep it up!`,
      data: { days },
    });
  }

  /**
   * Send a program progress notification
   */
  async notifyProgramProgress(programName: string, week: number, totalWeeks: number): Promise<void> {
    const percentage = Math.round((week / totalWeeks) * 100);
    
    await this.showLocalNotification({
      type: 'program_progress',
      title: '📈 Program Progress',
      body: `Week ${week} of ${totalWeeks} complete on ${programName}! (${percentage}%)`,
      data: { programName, week, totalWeeks, percentage },
    });
  }

  /**
   * Send an inactivity reminder
   */
  async notifyInactivity(daysSinceLastWorkout: number): Promise<void> {
    if (daysSinceLastWorkout < 3) return; // Don't nag for rest days

    let message: string;
    if (daysSinceLastWorkout >= 7) {
      message = `It's been ${daysSinceLastWorkout} days since your last workout. Ready to get back on track?`;
    } else {
      message = `Haven't seen you in ${daysSinceLastWorkout} days. Time to hit the gym?`;
    }

    await this.showLocalNotification({
      type: 'inactivity',
      title: '💤 Missing Your Workouts',
      body: message,
      data: { daysSinceLastWorkout },
    });
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

// Development tools
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).NotificationService = notificationService;
}

