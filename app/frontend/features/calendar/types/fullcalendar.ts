export type FullCalendarEventChangeInfo = {
	event: {
		id: string
		title: string
		start: Date
		end?: Date | undefined
		startStr?: string
		endStr?: string
		extendedProps?: Record<string, unknown>
	}
	oldEvent?:
		| {
				id: string
				title: string
				start: Date
				end?: Date | undefined
				startStr?: string
				endStr?: string
				extendedProps?: Record<string, unknown>
		  }
		| undefined
	revert?: (() => void) | undefined
}

export type FullCalendarApi = {
	getEvents: () => Array<{
		id: string
		title: string
		start: Date
		end?: Date
		extendedProps?: Record<string, unknown>
		remove: () => void
	}>
	getEventById?: (id: string) => FullCalendarEvent | null
	refetchEvents: () => void
	[key: string]: unknown
}

export type FullCalendarEvent = {
	id: string
	title?: string
	start?: Date
	end?: Date
	startStr?: string
	endStr?: string
	extendedProps?: Record<string, unknown>
	setExtendedProp?: (key: string, value: unknown) => void
	remove?: () => void
}

export type CalendarEventData = {
	id: string
	title?: string
	start?: string
	end?: string
	extendedProps?: Record<string, unknown>
}
