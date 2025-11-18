import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render as rtlRender } from '@testing-library/react'
import type React from 'react'

export const render = (ui: React.ReactElement) => {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	})
	return rtlRender(
		<QueryClientProvider client={client}>{ui}</QueryClientProvider>
	)
}

export * from '@testing-library/react'
