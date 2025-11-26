/**
 * Workout Reminder Scheduler
 * 
 * Schedules and manages local notifications for workout reminders.
 * Works with the active program to determine upcoming workout days.
 */

import { LocalNotifications, ScheduleOptions, PendingLocalNotificationSchema } from '@capacitor/local-notifications';
import { isNative, isPluginAvailable } from './platform';
import { Preferences } from '@capacitor/preferences';

/**
 * Reminder configuration
 */
export interface ReminderConfig {
  enabled: boolean;
  time: string; // HH:mm format (e.g., "09:00")
  daysOfWeek: number[]; // 0 = Sunday, 1 = Monday, etc.
  advanceMinutes: number; // How many minutes before workout to remind
}

/**
 * Default reminder configuration
 */
const DEFAULT_CONFIG: ReminderConfig = {
  enabled: true,
  time: '09:00',
  daysOfWeek: [1, 2, 3, 4, 5], // Monday-Friday
  advanceMinutes: 60, // 1 hour before
};

const STORAGE_KEY = 'overtrain_reminder_config';
const NOTIFICATION_CHANNEL_ID = 'workout-reminders';

/**
 * Reminder Scheduler Service
 */
class ReminderSchedulerService {
  private config: ReminderConfig = DEFAULT_CONFIG;
  private initialized = false;

  /**
   * Initialize the reminder scheduler
   */
  async initialize(): Promise<void> {
    if (!isNative() || !isPluginAvailable('LocalNotifications')) {
      console.log('[ReminderScheduler] Not available on this platform');
      return;
    }

    try {
      // Request notification permissions
      const permResult = await LocalNotifications.requestPermissions();
      if (permResult.display !== 'granted') {
        console.warn('[ReminderScheduler] Notification permissions not granted');
        return;
      }

      // Create notification channel (Android)
      await LocalNotifications.createChannel({
        id: NOTIFICATION_CHANNEL_ID,
        name: 'Workout Reminders',
        description: 'Reminders for your scheduled workouts',
        importance: 4, // High
        visibility: 1, // Public
        sound: 'default',
        vibration: true,
        lights: true,
        lightColor: '#3b82f6',
      });

      // Load saved configuration
      await this.loadConfig();

      // Schedule initial reminders
      if (this.config.enabled) {
        await this.scheduleReminders();
      }

      this.initialized = true;
      console.log('[ReminderScheduler] Initialized');
    } catch (error) {
      console.error('[ReminderScheduler] Initialization failed:', error);
    }
  }

  /**
   * Get current reminder configuration
   */
  getConfig(): ReminderConfig {
    return { ...this.config };
  }

  /**
   * Update reminder configuration
   */
  async updateConfig(newConfig: Partial<ReminderConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    await this.saveConfig();

    // Reschedule reminders with new config
    await this.cancelAllReminders();
    if (this.config.enabled) {
      await this.scheduleReminders();
    }
  }

  /**
   * Enable/disable reminders
   */
  async setEnabled(enabled: boolean): Promise<void> {
    await this.updateConfig({ enabled });
  }

  /**
   * Schedule workout reminders for the next 7 days
   */
  async scheduleReminders(programName?: string, workoutDays?: { day: number; name: string }[]): Promise<void> {
    if (!isNative() || !isPluginAvailable('LocalNotifications')) {
      return;
    }

    // Cancel existing reminders first
    await this.cancelAllReminders();

    if (!this.config.enabled) {
      console.log('[ReminderScheduler] Reminders disabled');
      return;
    }

    const notifications: ScheduleOptions['notifications'] = [];
    const now = new Date();
    const [hours, minutes] = this.config.time.split(':').map(Number);

    // Schedule for the next 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() + i);
      date.setHours(hours, minutes, 0, 0);

      // Skip if in the past
      if (date <= now) continue;

      // Check if this day of week is included
      const dayOfWeek = date.getDay();
      if (!this.config.daysOfWeek.includes(dayOfWeek)) continue;

      // Find workout for this day if provided
      const workoutInfo = workoutDays?.find(w => w.day === dayOfWeek);
      const workoutName = workoutInfo?.name || 'Your workout';

      notifications.push({
        id: this.generateNotificationId(date),
        title: '💪 Time to Train!',
        body: programName 
          ? `${workoutName} from ${programName} is waiting for you!`
          : `${workoutName} is scheduled for today. Let's crush it!`,
        schedule: {
          at: date,
          allowWhileIdle: true,
        },
        channelId: NOTIFICATION_CHANNEL_ID,
        smallIcon: 'ic_stat_icon',
        iconColor: '#3b82f6',
        sound: 'default',
        actionTypeId: 'WORKOUT_REMINDER',
        extra: {
          type: 'workout_reminder',
          date: date.toISOString(),
        },
      });
    }

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications });
      console.log(`[ReminderScheduler] Scheduled ${notifications.length} reminders`);
    }
  }

  /**
   * Schedule a single reminder for a specific workout
   */
  async scheduleWorkoutReminder(
    workoutId: string,
    workoutName: string,
    scheduledTime: Date,
    programName?: string
  ): Promise<number> {
    if (!isNative() || !isPluginAvailable('LocalNotifications')) {
      return -1;
    }

    const reminderTime = new Date(scheduledTime);
    reminderTime.setMinutes(reminderTime.getMinutes() - this.config.advanceMinutes);

    // Don't schedule if in the past
    if (reminderTime <= new Date()) {
      return -1;
    }

    const notificationId = this.generateNotificationId(reminderTime);

    await LocalNotifications.schedule({
      notifications: [{
        id: notificationId,
        title: '💪 Workout Starting Soon!',
        body: programName 
          ? `${workoutName} from ${programName} starts in ${this.config.advanceMinutes} minutes`
          : `${workoutName} starts in ${this.config.advanceMinutes} minutes`,
        schedule: {
          at: reminderTime,
          allowWhileIdle: true,
        },
        channelId: NOTIFICATION_CHANNEL_ID,
        smallIcon: 'ic_stat_icon',
        iconColor: '#3b82f6',
        sound: 'default',
        actionTypeId: 'WORKOUT_START',
        extra: {
          type: 'workout_start',
          workoutId,
          workoutName,
        },
      }],
    });

    console.log(`[ReminderScheduler] Scheduled reminder for ${workoutName} at ${reminderTime.toISOString()}`);
    return notificationId;
  }

  /**
   * Cancel a specific reminder
   */
  async cancelReminder(notificationId: number): Promise<void> {
    if (!isNative() || !isPluginAvailable('LocalNotifications')) {
      return;
    }

    await LocalNotifications.cancel({
      notifications: [{ id: notificationId }],
    });
  }

  /**
   * Cancel all scheduled reminders
   */
  async cancelAllReminders(): Promise<void> {
    if (!isNative() || !isPluginAvailable('LocalNotifications')) {
      return;
    }

    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({
        notifications: pending.notifications.map(n => ({ id: n.id })),
      });
      console.log(`[ReminderScheduler] Cancelled ${pending.notifications.length} reminders`);
    }
  }

  /**
   * Get pending reminders
   */
  async getPendingReminders(): Promise<PendingLocalNotificationSchema[]> {
    if (!isNative() || !isPluginAvailable('LocalNotifications')) {
      return [];
    }

    const pending = await LocalNotifications.getPending();
    return pending.notifications;
  }

  /**
   * Generate a unique notification ID from a date
   */
  private generateNotificationId(date: Date): number {
    // Use timestamp modulo to fit in 32-bit integer
    return Math.floor(date.getTime() / 1000) % 2147483647;
  }

  /**
   * Load configuration from storage
   */
  private async loadConfig(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: STORAGE_KEY });
      if (value) {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(value) };
      }
    } catch (error) {
      console.warn('[ReminderScheduler] Failed to load config:', error);
    }
  }

  /**
   * Save configuration to storage
   */
  private async saveConfig(): Promise<void> {
    try {
      await Preferences.set({
        key: STORAGE_KEY,
        value: JSON.stringify(this.config),
      });
    } catch (error) {
      console.warn('[ReminderScheduler] Failed to save config:', error);
    }
  }
}

// Export singleton instance
export const reminderScheduler = new ReminderSchedulerService();

// Development tools
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).ReminderScheduler = reminderScheduler;
}

