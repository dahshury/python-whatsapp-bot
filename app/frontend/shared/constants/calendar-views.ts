export type CalendarViewOption = {
	value: string
	label: string
	description?: string
}

export const CALENDAR_VIEW_OPTIONS: CalendarViewOption[] = [
	{
		value: 'timeGridWeek',
		label: 'Week (Time Grid)',
		description:
			'Week view with hourly grid slots (FullCalendar timeGridWeek).',
	},
	{
		value: 'dayGridMonth',
		label: 'Month',
		description: 'Classic month grid with all-day tiles (dayGridMonth).',
	},
	{
		value: 'listMonth',
		label: 'List',
		description: 'Agenda-style monthly list of events (listMonth).',
	},
	{
		value: 'multiMonthYear',
		label: 'Multi-Month',
		description: 'Compact multi-month overview (multiMonthYear).',
	},
]

export const DEFAULT_CALENDAR_VIEW_VALUES = CALENDAR_VIEW_OPTIONS.map(
	(option) => option.value
)
