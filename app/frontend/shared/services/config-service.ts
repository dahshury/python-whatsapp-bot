/**
 * Service for fetching and managing app configuration from the backend.
 */

import {
	DEFAULT_WORKING_DAYS,
	MONDAY,
	SATURDAY,
	SUNDAY,
	THURSDAY,
	TUESDAY,
	WEDNESDAY,
} from '@/shared/constants/days-of-week'

export type WorkingHoursConfig = {
	days_of_week: number[]
	start_time: string
	end_time: string
}

export type DaySpecificWorkingHours = {
	day_of_week: number
	start_time: string
	end_time: string
}

export type DaySpecificSlotDuration = {
	day_of_week: number
	slot_duration_hours: number
}

export type CustomCalendarRangeConfig = {
	name: string
	start_date: string
	end_date: string
	working_days: number[]
	start_time: string
	end_time: string
	slot_duration_hours?: number | null
}

export type ColumnConfig = {
	id: string
	name: string
	title: string
	data_type: string
	is_editable: boolean
	is_required: boolean
	width?: number | null
	metadata?: Record<string, unknown> | null
}

export type AppConfig = {
	id: number
	working_days: number[]
	default_working_hours: WorkingHoursConfig
	day_specific_hours: DaySpecificWorkingHours[]
	slot_duration_hours: number
	day_specific_slot_durations: DaySpecificSlotDuration[]
	custom_calendar_ranges: CustomCalendarRangeConfig[]
	calendar_columns: ColumnConfig[]
	documents_columns: ColumnConfig[]
	default_country_prefix: string
	available_languages: string[]
	created_at: string
	updated_at: string
}

let configCache: AppConfig | null = null
let configPromise: Promise<AppConfig> | null = null
const configChangeListeners: Set<() => void> = new Set()

/**
 * Fetch app configuration from the backend.
 * Uses caching to avoid redundant requests.
 */
export function fetchAppConfig(): Promise<AppConfig> {
	// Return cached config if available
	if (configCache) {
		return Promise.resolve(configCache)
	}

	// Return existing promise if a request is already in flight
	if (configPromise) {
		return configPromise
	}

	// Create new request
	configPromise = (async () => {
		try {
			const response = await fetch('/api/config')
			if (!response.ok) {
				throw new Error(`Failed to fetch config: ${response.statusText}`)
			}
			const config = (await response.json()) as AppConfig
			configCache = config
			return config
		} catch (_error) {
			// Return default config on error
			return getDefaultConfig()
		} finally {
			configPromise = null
		}
	})()

	return configPromise
}

/**
 * Get default configuration (fallback when API fails).
 */
export function getDefaultConfig(): AppConfig {
	return {
		id: 0,
		working_days: DEFAULT_WORKING_DAYS, // Sunday through Thursday, Saturday
		default_working_hours: {
			days_of_week: [SUNDAY, MONDAY, TUESDAY, WEDNESDAY, THURSDAY],
			start_time: '11:00',
			end_time: '17:00',
		},
		day_specific_hours: [
			{
				day_of_week: SATURDAY, // Saturday
				start_time: '16:00',
				end_time: '22:00',
			},
		],
		slot_duration_hours: 2,
		day_specific_slot_durations: [],
		custom_calendar_ranges: [],
		calendar_columns: [
			{
				id: 'scheduled_time',
				name: 'scheduled_time',
				title: 'field_time_scheduled',
				data_type: 'datetime',
				is_editable: true,
				is_required: true,
				width: 170,
			},
			{
				id: 'phone',
				name: 'phone',
				title: 'field_phone',
				data_type: 'phone',
				is_editable: true,
				is_required: true,
				width: 150,
			},
			{
				id: 'type',
				name: 'type',
				title: 'field_type',
				data_type: 'dropdown',
				is_editable: true,
				is_required: true,
				width: 100,
				metadata: { options: ['appt_checkup', 'appt_followup'] },
			},
			{
				id: 'name',
				name: 'name',
				title: 'field_name',
				data_type: 'text',
				is_editable: true,
				is_required: true,
				width: 150,
			},
		],
		documents_columns: [
			{
				id: 'name',
				name: 'name',
				title: 'field_name',
				data_type: 'text',
				is_editable: true,
				is_required: true,
				width: 150,
			},
			{
				id: 'age',
				name: 'age',
				title: 'field_age',
				data_type: 'number',
				is_editable: true,
				is_required: false,
				width: 50,
				metadata: { useWheel: true },
			},
			{
				id: 'phone',
				name: 'phone',
				title: 'field_phone',
				data_type: 'phone',
				is_editable: true,
				is_required: true,
				width: 150,
			},
		],
		default_country_prefix: 'SA',
		available_languages: ['en', 'ar'],
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
	}
}

/**
 * Clear the configuration cache (useful after updates).
 * Notifies all listeners that config has changed.
 */
export function clearConfigCache(): void {
	configCache = null
	configPromise = null
	// Notify all listeners that config has changed
	for (const listener of configChangeListeners) {
		try {
			listener()
		} catch (_error) {
			// Ignore errors from listeners
		}
	}
}

/**
 * Subscribe to config changes.
 * Returns an unsubscribe function.
 */
export function onConfigChange(listener: () => void): () => void {
	configChangeListeners.add(listener)
	return () => {
		configChangeListeners.delete(listener)
	}
}
