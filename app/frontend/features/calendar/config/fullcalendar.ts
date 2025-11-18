import { getValidRange } from '@shared/libs/calendar/calendar-config'
import type { EventLoadingConfig } from '@/entities/app-config'

export function getGlobalValidRange(
	freeRoam: boolean,
	overrideValidRange?: boolean
): Record<string, unknown> | undefined {
	if (freeRoam) {
		return
	}
	if (overrideValidRange) {
		return
	}
	return getValidRange(freeRoam) as unknown as Record<string, unknown>
}

export function getViewsProp(
	eventLoading?: EventLoadingConfig | null
): Record<string, unknown> {
	// Use config values if provided, otherwise use defaults
	const dayMaxEvents = eventLoading?.dayMaxEvents ?? true
	const dayMaxEventRows = eventLoading?.dayMaxEventRows ?? true
	const moreLinkClick = eventLoading?.moreLinkClick ?? 'popover'

	return {
		multiMonthYear: {
			dayMaxEvents,
			dayMaxEventRows,
			moreLinkClick,
		},
		dayGridMonth: {
			dayMaxEvents,
			dayMaxEventRows,
			moreLinkClick,
		},
		dayGridWeek: {
			dayMaxEvents,
			dayMaxEventRows,
			moreLinkClick,
		},
		timeGridWeek: {
			allDaySlot: false,
		},
	} as const
}

export function getConstraintsProp(
	freeRoam: boolean,
	currentView: string
): Record<string, unknown> {
	const enabled =
		!freeRoam && (currentView || '').toLowerCase().includes('timegrid')
	return enabled
		? ({
				eventConstraint: 'businessHours' as const,
				selectConstraint: 'businessHours' as const,
			} as const)
		: ({} as const)
}
