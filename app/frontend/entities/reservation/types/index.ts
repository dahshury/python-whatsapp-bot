export type ReservationId = number | string
export type WaId = number | string

export type ReservationType = 0 | 1 | 2 | number

export type CalendarSlot = {
	date: string // YYYY-MM-DD
	time: string // HH:mm (slot base)
}

export type ModifyReservationCommand = CalendarSlot & {
	waId: WaId
	title?: string
	type?: ReservationType
	approximate?: boolean
	reservationId?: ReservationId
	isLocalized?: boolean
}

export type CancelReservationCommand = {
	waId: WaId
	date: string
	isLocalized?: boolean
}
