import type { PrefetchResolver } from './types'

export const defaultResolver: PrefetchResolver = async () => ({
	success: true,
	payload: {},
})
