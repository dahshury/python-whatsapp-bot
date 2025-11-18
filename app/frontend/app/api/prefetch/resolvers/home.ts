import { preloadPathModules } from '@/shared/libs/prefetch/registry'
import type { PrefetchResolver } from './types'

export const homeResolver: PrefetchResolver = async () => {
	// Silently ignore errors from preloading path modules
	await preloadPathModules('/').catch(() => {
		// Ignore module preload errors
	})
	return {
		success: true,
		payload: {},
	}
}
