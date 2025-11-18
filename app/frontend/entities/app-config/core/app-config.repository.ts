import type { AppConfigUpdateInput } from '../types/app-config.types'
import type { AppConfig } from './app-config.domain'

export type AppConfigRepository = {
	getConfig(): Promise<AppConfig>
	updateConfig(input: AppConfigUpdateInput): Promise<AppConfig>
}
