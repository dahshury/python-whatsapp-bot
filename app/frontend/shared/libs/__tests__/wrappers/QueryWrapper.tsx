'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type React from 'react'

export const createTestQueryClient = (): QueryClient =>
	new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
				gcTime: 0,
				staleTime: 0,
			},
			mutations: {
				retry: false,
			},
		},
	})

type QueryWrapperProps = {
	children: React.ReactNode
	queryClient?: QueryClient
}

export const QueryWrapper: React.FC<QueryWrapperProps> = ({
	children,
	queryClient,
}) => {
	const testQueryClient = queryClient || createTestQueryClient()

	return (
		<QueryClientProvider client={testQueryClient}>
			{children}
		</QueryClientProvider>
	)
}

export default QueryWrapper
