import { BaseError } from '@/shared/libs/errors/base-error'
import type { Vacation } from '../types/vacation.types'
import { VacationDateRange } from '../value-objects'
import { VacationDomain } from './vacation.domain'

export function createNewVacation(
	start: string,
	end: string,
	id?: string
): VacationDomain {
	if (!start) {
		throw BaseError.validation('Vacation start date is required')
	}
	if (!end) {
		throw BaseError.validation('Vacation end date is required')
	}

	// Validate date range through VO
	new VacationDateRange({ start, end })

	const vacation: Vacation = {
		id: id || '',
		start,
		end,
	}
	return new VacationDomain(vacation)
}

export function createVacationFromDto(dto: Partial<Vacation>): VacationDomain {
	if (!dto.start) {
		throw BaseError.validation('Invalid vacation DTO: missing start date')
	}
	if (!dto.end) {
		throw BaseError.validation('Invalid vacation DTO: missing end date')
	}

	// Validate date range through VO
	new VacationDateRange({ start: dto.start, end: dto.end })

	return new VacationDomain({
		id: String(dto.id || ''),
		start: dto.start,
		end: dto.end,
	})
}

export function createVacationForDateRange(
	start: Date,
	end: Date,
	id?: string
): VacationDomain {
	return createNewVacation(start.toISOString(), end.toISOString(), id)
}
