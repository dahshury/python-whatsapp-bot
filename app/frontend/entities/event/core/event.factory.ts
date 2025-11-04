import { BaseError } from '@/shared/libs/errors/base-error'
import type { CalendarEvent, Reservation } from '../types/event.types'
import { EventDateTime } from '../value-objects/event-datetime.vo'
import { EventDomain } from './event.domain'

export function createEventFromCalendar(event: CalendarEvent): EventDomain {
	if (!event) {
		throw BaseError.validation('Calendar event is required')
	}
	// Validate dates through VOs
	if (event.start) {
		new EventDateTime(event.start)
	}
	if (event.end) {
		new EventDateTime(event.end)
	}
	return new EventDomain(event, undefined)
}

export function createEventFromReservation(
	reservation: Reservation
): EventDomain {
	if (!reservation) {
		throw BaseError.validation('Reservation is required')
	}
	// Validate date through VO
	if (reservation.date) {
		new EventDateTime(reservation.date)
	}
	return new EventDomain(undefined, reservation)
}

export function createEventFromBoth(
	event: CalendarEvent,
	reservation: Reservation
): EventDomain {
	if (!(event || reservation)) {
		throw BaseError.validation(
			'At least one of event or reservation is required'
		)
	}
	// Validate dates
	if (event?.start) {
		new EventDateTime(event.start)
	}
	if (event?.end) {
		new EventDateTime(event.end)
	}
	if (reservation?.date) {
		new EventDateTime(reservation.date)
	}
	return new EventDomain(event, reservation)
}

export function createEmptyEvent(): EventDomain {
	return new EventDomain(undefined, undefined)
}
