import { AppConfigApiRepository } from '@/entities/app-config'
import { AppConfigService } from './app-config.service'

let cachedService: ReturnType<typeof AppConfigService> | null = null

export const createAppConfigService = () => {
	if (cachedService) {
		return cachedService
	}
	const repository = new AppConfigApiRepository()
	cachedService = AppConfigService(repository)
	return cachedService
}
