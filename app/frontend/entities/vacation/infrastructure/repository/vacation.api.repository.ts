import type { VacationDomain } from '../../core/vacation.domain'
import type { VacationRepository } from '../../core/vacation.repository'
import {
	vacationDomainToDto,
	vacationDtoListToDomain,
	vacationDtoToDomain,
} from '../../mapper/vacation.mapper'
import { VacationAdapter } from '../api/vacation.adapter'

export class VacationApiRepository implements VacationRepository {
	private readonly adapter = VacationAdapter()

	async getAll(): Promise<VacationDomain[]> {
		const dtos = await this.adapter.list()
		return vacationDtoListToDomain(dtos)
	}

	async save(vacation: VacationDomain): Promise<VacationDomain> {
		const dto = vacationDomainToDto(vacation)
		const saved = await this.adapter.save(dto)
		return vacationDtoToDomain(saved)
	}

	async delete(id: string): Promise<boolean> {
		return await this.adapter.delete(id)
	}
}
