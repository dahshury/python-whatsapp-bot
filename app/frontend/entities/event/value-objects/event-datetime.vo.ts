import { ValueObject } from '@/shared/domain/value-object'
import { BaseError } from '@/shared/libs/errors/base-error'

export class EventDateTime extends ValueObject<string> {
	protected validate(value: string): void {
		// ISO date or valid date string
		const d = new Date(value)
		if (Number.isNaN(d.getTime())) {
			throw BaseError.validation('Invalid event date/time')
		}
	}

	toDate(): Date {
		return new Date(this._value)
	}
}

export default EventDateTime
