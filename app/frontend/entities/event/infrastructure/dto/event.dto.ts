export type CalendarEventDto = {
	id: string
	title: string
	start: string
	end?: string
	allDay?: boolean
	[key: string]: unknown
}

export type ReservationDto = {
	id?: number
	customer_id: string
	date: string
	time_slot: string
	customer_name: string
	type: number
	cancelled?: boolean
	[key: string]: unknown
}
