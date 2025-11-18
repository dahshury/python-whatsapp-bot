import { ValueObject } from '@/shared/domain/value-object'
import { BaseError } from '@/shared/libs/errors/base-error'
import { RSVPStatus } from '../types/rsvp.types'

export class RsvpStatusVO extends ValueObject<RSVPStatus> {
	protected validate(value: RSVPStatus): void {
		const validStatuses = Object.values(RSVPStatus)
		if (!validStatuses.includes(value)) {
			throw BaseError.validation(
				`Invalid RSVP status. Must be one of: ${validStatuses.join(', ')}`
			)
		}
	}

	isPending(): boolean {
		return this._value === RSVPStatus.PENDING
	}

	isConfirmed(): boolean {
		return this._value === RSVPStatus.CONFIRMED
	}

	isCancelled(): boolean {
		return this._value === RSVPStatus.CANCELLED
	}

	isDeclined(): boolean {
		return this._value === RSVPStatus.DECLINED
	}
}

export default RsvpStatusVO
