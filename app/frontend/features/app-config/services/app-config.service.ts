import type {
	AppConfigRepository,
	AppConfigUpdateInput,
} from '@/entities/app-config'
import type { AppConfigUseCase } from '../usecase/app-config.usecase'

export const AppConfigService = (
	repository: AppConfigRepository
): AppConfigUseCase => ({
	getConfig: async () => repository.getConfig(),
	updateConfig: async (input: AppConfigUpdateInput) =>
		repository.updateConfig(input),
})
