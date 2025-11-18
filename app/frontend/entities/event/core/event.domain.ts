import type { CalendarEvent, Reservation } from '../types/event.types'
import { EventDateTime } from '../value-objects/event-datetime.vo'

export class EventDomain {
	private _event?: CalendarEvent | undefined
	private _reservation?: Reservation | undefined

	constructor(event?: CalendarEvent, reservation?: Reservation) {
		this._event = event ? { ...event } : undefined
		this._reservation = reservation ? { ...reservation } : undefined

		if (this._event?.start) {
			this._event.start = new EventDateTime(this._event.start).value
		}
		if (this._event?.end) {
			this._event.end = new EventDateTime(this._event.end).value
		}
		if (this._reservation?.date) {
			this._reservation.date = new EventDateTime(this._reservation.date).value
		}
	}

	updateEvent(update: Partial<CalendarEvent>): void {
		const current = (this._event as CalendarEvent) ?? ({} as CalendarEvent)
		const next: CalendarEvent = { ...current, ...(update as CalendarEvent) }
		if (next.start) {
			next.start = new EventDateTime(next.start).value
		}
		if (next.end) {
			next.end = new EventDateTime(next.end).value
		}
		this._event = next
	}

	updateReservation(update: Partial<Reservation>): void {
		const current = (this._reservation as Reservation) ?? ({} as Reservation)
		const next: Reservation = { ...current, ...(update as Reservation) }
		if (next.date) {
			next.date = new EventDateTime(next.date).value
		}
		this._reservation = next
	}

	get event(): CalendarEvent | undefined {
		return this._event
	}

	get reservation(): Reservation | undefined {
		return this._reservation
	}

	markCancelled(): void {
		if (this._event) {
			this._event.extendedProps = {
				...(this._event.extendedProps ?? {}),
				cancelled: true,
			}
		}
		if (this._reservation) {
			this._reservation.cancelled = true
		}
	}

	get isCancelled(): boolean {
		return Boolean(
			this._event?.extendedProps?.cancelled || this._reservation?.cancelled
		)
	}

	hasEvent(): boolean {
		return this._event !== undefined
	}

	hasReservation(): boolean {
		return this._reservation !== undefined
	}

	getStartDate(): Date | undefined {
		const startStr = this._event?.start || this._reservation?.date
		if (!startStr) {
			return
		}
		return new EventDateTime(startStr).toDate()
	}

	getEndDate(): Date | undefined {
		if (!this._event?.end) {
			return
		}
		return new EventDateTime(this._event.end).toDate()
	}

	getDuration(): number | undefined {
		const start = this.getStartDate()
		const end = this.getEndDate()
		if (!(start && end)) {
			return
		}
		return end.getTime() - start.getTime()
	}

	getDurationInHours(): number | undefined {
		const durationMs = this.getDuration()
		if (!durationMs) {
			return
		}
		const MILLISECONDS_PER_SECOND = 1000
		const SECONDS_PER_MINUTE = 60
		const MINUTES_PER_HOUR = 60
		const MILLISECONDS_PER_HOUR =
			MILLISECONDS_PER_SECOND * SECONDS_PER_MINUTE * MINUTES_PER_HOUR
		return durationMs / MILLISECONDS_PER_HOUR
	}

	isUpcoming(currentDate?: Date): boolean {
		const start = this.getStartDate()
		if (!start) {
			return false
		}
		const now = currentDate || new Date()
		return start.getTime() > now.getTime()
	}

	isPast(currentDate?: Date): boolean {
		const end = this.getEndDate() || this.getStartDate()
		if (!end) {
			return false
		}
		const now = currentDate || new Date()
		return end.getTime() < now.getTime()
	}

	isActive(currentDate?: Date): boolean {
		const start = this.getStartDate()
		const end = this.getEndDate()
		if (!start) {
			return false
		}
		const now = currentDate || new Date()
		const nowTime = now.getTime()

		if (end) {
			return start.getTime() <= nowTime && nowTime <= end.getTime()
		}

		return start.getTime() <= nowTime
	}

	getTitle(): string | undefined {
		return this._event?.title
	}

	getEventId(): string | undefined {
		return this._event?.id || this._reservation?.id?.toString()
	}
}
