import { callPythonBackendCached } from '@/shared/libs/backend'
import { preloadPathModules } from '@/shared/libs/prefetch/registry'
import type { PrefetchQueryPayload, PrefetchResolver } from './types'

type CustomerName = {
	wa_id: string
	customer_name: string | null
}

type CustomerNamesResponse = {
	success?: boolean
	data?: Record<string, CustomerName>
}

export const documentsResolver: PrefetchResolver = async () => {
	// Silently ignore errors from preloading path modules
	await preloadPathModules('/documents').catch(() => {
		// Ignore module preload errors
	})

	const queries: PrefetchQueryPayload[] = []

	try {
		const response = await callPythonBackendCached<CustomerNamesResponse>(
			'/customers/names',
			undefined,
			{
				revalidate: 300,
				keyParts: ['prefetch', 'customers', 'names'],
				tags: ['customer-names'],
			}
		)
		if (response?.success && response.data) {
			queries.push({ key: ['customer-names'], data: response.data })
		}
	} catch (_error) {
		// Silently ignore prefetch errors - prefetch is optional
	}

	return {
		success: true,
		payload: queries.length ? { queries } : {},
	}
}
