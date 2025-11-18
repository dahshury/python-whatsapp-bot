import { VacationDomain } from '../core/vacation.domain'
import type { VacationDto } from '../infrastructure/dto/vacation.dto'
import type { Vacation } from '../types/vacation.types'

export function vacationDomainToDto(v: VacationDomain): VacationDto {
	const val = v.value as Vacation
	return { id: val.id, start: val.start, end: val.end }
}

export function vacationDtoToDomain(dto: VacationDto): VacationDomain {
	return new VacationDomain({
		id: String(dto.id || ''),
		start: String(dto.start || ''),
		end: String(dto.end || ''),
	})
}

export function vacationDtoListToDomain(dtos: VacationDto[]): VacationDomain[] {
	return dtos.map((d) => vacationDtoToDomain(d))
}
