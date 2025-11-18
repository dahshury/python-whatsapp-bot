import type { AppConfigRepository } from '../../core/app-config.repository'
import { AppConfigMapper } from '../../mapper/app-config.mapper'
import type { AppConfigUpdateInput } from '../../types/app-config.types'
import { AppConfigAdapter } from '../api/app-config.adapter'

export class AppConfigApiRepository implements AppConfigRepository {
	private readonly api = AppConfigAdapter()

	async getConfig() {
		const dto = await this.api.fetch()
		return AppConfigMapper.toDomain(dto)
	}

	async updateConfig(input: AppConfigUpdateInput) {
		const dtoPayload = AppConfigMapper.toUpdateDto(input)
		const dto = await this.api.update(dtoPayload)
		return AppConfigMapper.toDomain(dto)
	}
}
