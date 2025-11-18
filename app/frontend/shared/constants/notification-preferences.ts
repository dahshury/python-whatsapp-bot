import type { NotificationPreferencesConfig } from '@/entities/app-config'

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferencesConfig =
	Object.freeze({
		notifyOnEventCreate: true,
		notifyOnEventUpdate: true,
		notifyOnEventDelete: true,
		notifyOnEventReminder: false,
		notificationSound: false,
		notificationDesktop: false,
		notificationEmail: false,
		notificationDelay: 0,
		quietHours: null,
	})

export function mergeNotificationPreferences(
	value: NotificationPreferencesConfig | null | undefined
): NotificationPreferencesConfig {
	if (!value) {
		return DEFAULT_NOTIFICATION_PREFERENCES
	}
	return {
		...DEFAULT_NOTIFICATION_PREFERENCES,
		...value,
		quietHours:
			value.quietHours ?? DEFAULT_NOTIFICATION_PREFERENCES.quietHours ?? null,
	}
}
