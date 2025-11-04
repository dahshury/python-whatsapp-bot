import { BaseError } from '@/shared/libs/errors/base-error'
import type { RSVP } from '../types/rsvp.types'
import { RSVPStatus } from '../types/rsvp.types'
import { RsvpStatusVO } from '../value-objects'
import { RsvpDomain } from './rsvp.domain'

export function createNewRsvp(
	eventId: string,
	customerId: string,
	id?: string
): RsvpDomain {
	if (!eventId?.trim()) {
		throw BaseError.validation('Event ID is required to create an RSVP')
	}
	if (!customerId?.trim()) {
		throw BaseError.validation('Customer ID is required to create an RSVP')
	}

	const now = new Date().toISOString()
	const rsvp: RSVP = {
		id: id || '',
		eventId,
		customerId,
		status: RSVPStatus.PENDING,
		createdAt: now,
		updatedAt: now,
	}
	return new RsvpDomain(rsvp)
}

export function createRsvpFromDto(dto: Partial<RSVP>): RsvpDomain {
	const now = new Date().toISOString()

	if (!dto.eventId) {
		throw BaseError.validation('Invalid RSVP DTO: missing eventId')
	}
	if (!dto.customerId) {
		throw BaseError.validation('Invalid RSVP DTO: missing customerId')
	}

	// Validate status through VO
	const status = dto.status || RSVPStatus.PENDING
	new RsvpStatusVO(status)

	return new RsvpDomain({
		id: dto.id ?? '',
		eventId: String(dto.eventId),
		customerId: String(dto.customerId),
		status,
		createdAt: dto.createdAt || now,
		updatedAt: dto.updatedAt || now,
	})
}
