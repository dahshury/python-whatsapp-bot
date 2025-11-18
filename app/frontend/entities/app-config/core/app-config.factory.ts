import { THEME_OPTIONS } from '@/features/settings/settings/theme-data'
import { DEFAULT_CALENDAR_VIEW_VALUES } from '@/shared/constants/calendar-views'
import { splitCustomRangesByExpiry } from '../lib/custom-range.utils'

// Only use themes that are in THEME_OPTIONS (excludes "theme-inline" and other unsupported themes)
const VALID_THEME_VALUES = THEME_OPTIONS.map(
	(option) => option.value
) as readonly string[]

import type { AppConfigSnapshot } from '../types/app-config.types'
import {
	ColumnConfigVO,
	CountryCodeVO,
	LanguageListVO,
	LlmProviderVO,
	SlotDurationVO,
	TimezoneVO,
	WorkingHoursVO,
} from '../value-objects'
import { AppConfig } from './app-config.domain'

const cloneRanges = (ranges: AppConfigSnapshot['customCalendarRanges']) =>
	ranges.map((range) => ({ ...range }))

const filterAllowedValues = <T>(
	values: T[] | null | undefined,
	allowed: readonly T[]
): T[] => {
	const allowedSet = new Set(allowed)
	const filtered =
		values?.filter((value): value is T => allowedSet.has(value)) ?? []
	if (filtered.length === 0) {
		return Array.from(allowedSet)
	}
	return Array.from(new Set(filtered))
}

export function createAppConfig(snapshot: AppConfigSnapshot): AppConfig {
	const { active: activeRanges, expired: expiredRanges } =
		splitCustomRangesByExpiry(snapshot.customCalendarRanges)

	return new AppConfig({
		id: snapshot.id,
		workingDays: [...snapshot.workingDays],
		defaultWorkingHours: new WorkingHoursVO(snapshot.defaultWorkingHours),
		daySpecificWorkingHours: snapshot.daySpecificWorkingHours.map((hours) =>
			WorkingHoursVO.forDay(hours)
		),
		slotDuration: new SlotDurationVO({
			hours: snapshot.slotDurationHours,
		}),
		daySpecificSlotDurations: snapshot.daySpecificSlotDurations.map((slot) =>
			SlotDurationVO.forDay({
				dayOfWeek: slot.dayOfWeek,
				hours: slot.slotDurationHours,
			})
		),
		customCalendarRanges: cloneRanges(activeRanges),
		expiredCustomRanges: cloneRanges(expiredRanges),
		calendarColumns: snapshot.calendarColumns.map(
			(column) => new ColumnConfigVO(column)
		),
		documentsColumns: snapshot.documentsColumns.map(
			(column) => new ColumnConfigVO(column)
		),
		defaultCountry: CountryCodeVO.fromUnknown(
			snapshot.defaultCountryPrefix ?? 'SA'
		),
		availableLanguages: LanguageListVO.fromUnknown(snapshot.availableLanguages),
		availableThemes: filterAllowedValues(
			snapshot.availableThemes,
			VALID_THEME_VALUES
		),
		availableCalendarViews: filterAllowedValues(
			snapshot.availableCalendarViews,
			DEFAULT_CALENDAR_VIEW_VALUES
		),
		timezone: TimezoneVO.fromUnknown(snapshot.timezone),
		llmProvider: LlmProviderVO.fromUnknown(snapshot.llmProvider),
		calendarFirstDay: snapshot.calendarFirstDay ?? null,
		eventTimeFormat: snapshot.eventTimeFormat ?? null,
		defaultCalendarView: snapshot.defaultCalendarView ?? null,
		calendarLocale: snapshot.calendarLocale ?? null,
		calendarDirection: snapshot.calendarDirection ?? null,
		eventColors: snapshot.eventColors ?? null,
		notificationPreferences: snapshot.notificationPreferences ?? null,
		eventLoading: snapshot.eventLoading ?? null,
		eventDurationSettings: snapshot.eventDurationSettings ?? null,
		slotCapacitySettings: snapshot.slotCapacitySettings ?? null,
		createdAt: snapshot.createdAt,
		updatedAt: snapshot.updatedAt,
	})
}

export function mergeAppConfig(
	config: AppConfig,
	patch: Partial<AppConfigSnapshot>
): AppConfig {
	return createAppConfig({
		...config.toSnapshot(),
		...patch,
	})
}

// Legacy export for backward compatibility
export const AppConfigFactory = {
	create: createAppConfig,
	merge: mergeAppConfig,
}
