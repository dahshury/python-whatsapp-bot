'use client'

import {
	HydrationBoundary,
	type HydrationBoundaryProps,
	QueryClient,
	QueryClientProvider,
} from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

// Cache time constants (in milliseconds)
const SECONDS_PER_MINUTE = 60
const MS_PER_SECOND = 1000
const MS_PER_MINUTE = SECONDS_PER_MINUTE * MS_PER_SECOND
const STALE_TIME_MINUTES = 1
const STALE_TIME_MS = STALE_TIME_MINUTES * MS_PER_MINUTE
const GC_TIME_MINUTES = 5
const STALE_TIME_MODERATE_MINUTES = 5
const STALE_TIME_MODERATE_MS = STALE_TIME_MODERATE_MINUTES * MS_PER_MINUTE
const GC_TIME_EXTENDED_MINUTES = 10
const GC_TIME_EXTENDED_MS = GC_TIME_EXTENDED_MINUTES * MS_PER_MINUTE

/**
 * TanStack Query Provider with SSR/SSG Support
 *
 * Usage with SSR/SSG:
 * ```tsx
 * // In pages/_app.tsx or layout.tsx
 * export default function MyApp({ Component, pageProps }) {
 *   return (
 *     <TanstackQueryProvider dehydratedState={pageProps.dehydratedState}>
 *       <Component {...pageProps} />
 *     </TanstackQueryProvider>
 *   )
 * }
 *
 * // In a page with SSR (e.g., pages/users.tsx)
 * import { dehydrate, QueryClient } from '@tanstack/react-query'
 *
 * export async function getServerSideProps() {
 *   const queryClient = new QueryClient()
 *   await queryClient.prefetchQuery({
 *     queryKey: ['users'],
 *     queryFn: fetchUsers,
 *   })
 *   return {
 *     props: {
 *       dehydratedState: dehydrate(queryClient),
 *     },
 *   }
 * }
 * ```
 */
export const TanstackQueryProvider = ({
	children,
	dehydratedState,
}: {
	children: React.ReactNode
	dehydratedState?: HydrationBoundaryProps['state']
}) => {
	// Create QueryClient instance per render to avoid SSR cache pollution
	// This is the recommended pattern for Next.js and React Server Components
	const [queryClient] = useState(() => {
		const client = new QueryClient({
			defaultOptions: {
				queries: {
					staleTime: STALE_TIME_MS,
					gcTime: GC_TIME_MINUTES * MS_PER_MINUTE,
					refetchOnWindowFocus: true,
					// ✅ structuralSharing: true (default) - Prevents unnecessary re-renders
					// TanStack Query compares new data with old data and only triggers re-renders
					// if the data structure actually changed (not just reference)
				},
			},
		})

		// Set query defaults for specific query key patterns
		// This avoids repeating configuration in individual hooks

		// Calendar reservations (period-based) - never stale, WebSocket invalidates
		client.setQueryDefaults(['calendar', 'reservations'], {
			staleTime: Number.POSITIVE_INFINITY,
			gcTime: GC_TIME_EXTENDED_MS,
			refetchOnWindowFocus: false,
			refetchOnMount: false,
		})

		// Calendar conversations - never stale, WebSocket invalidates
		client.setQueryDefaults(['calendar', 'conversations'], {
			staleTime: Number.POSITIVE_INFINITY,
			gcTime: GC_TIME_EXTENDED_MS,
			refetchOnWindowFocus: false,
			refetchOnMount: false,
		})

		// Calendar vacations - rarely change, cache for longer
		client.setQueryDefaults(['calendar', 'vacations'], {
			staleTime: STALE_TIME_MODERATE_MS,
			gcTime: GC_TIME_EXTENDED_MS,
		})

		// Customer names - moderately static, cache for 5 minutes
		client.setQueryDefaults(['customer', 'names'], {
			staleTime: STALE_TIME_MODERATE_MS,
			gcTime: GC_TIME_EXTENDED_MS,
		})

		// Phone search - cache search results briefly
		client.setQueryDefaults(['phone', 'search'], {
			staleTime: MS_PER_MINUTE,
			gcTime: GC_TIME_MINUTES * MS_PER_MINUTE,
			refetchOnWindowFocus: false,
			refetchOnMount: false,
		})

		// Dashboard stats - prevent duplicate queries
		client.setQueryDefaults(['dashboard', 'stats'], {
			staleTime: STALE_TIME_MS,
			gcTime: GC_TIME_MINUTES * MS_PER_MINUTE,
			refetchOnWindowFocus: false,
			refetchOnMount: false,
			refetchOnReconnect: false,
		})

		// Documents - always fetch fresh (frequently edited)
		client.setQueryDefaults(['document'], {
			staleTime: 0,
			gcTime: 0,
			refetchOnMount: true,
		})

		return client
	})

	return (
		<QueryClientProvider client={queryClient}>
			<HydrationBoundary state={dehydratedState}>{children}</HydrationBoundary>
			{process.env.NODE_ENV === 'development' && (
				<ReactQueryDevtools initialIsOpen={false} />
			)}
		</QueryClientProvider>
	)
}
