'use client'

import { useQueryClient } from '@tanstack/react-query'
import NextLink, { type LinkProps } from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
	type AnchorHTMLAttributes,
	type RefObject,
	useCallback,
	useEffect,
	useRef,
} from 'react'
import { preloadPathModules } from '@/shared/libs/prefetch/registry'

/**
 * PrefetchLink Component
 *
 * Enhanced Next.js Link with data prefetching capabilities.
 *
 * ## Custom Prefetch Strategy
 *
 * This component uses a custom `/api/prefetch` endpoint instead of individual
 * `queryClient.prefetchQuery` calls. Here's why:
 *
 * ### Benefits:
 * 1. **Reduced HTTP Requests**: Single request fetches all page data instead of
 *    N separate requests for N queries.
 * 2. **Server-Side Batching**: Backend can optimize and batch database queries.
 * 3. **Faster Perceived Performance**: All data arrives together, avoiding
 *    progressive loading states during navigation.
 * 4. **Network Efficiency**: Especially beneficial on high-latency connections
 *    where request overhead is significant.
 *
 * ### Tradeoffs:
 * - Not the standard TanStack Query pattern (adds custom API layer)
 * - Requires maintaining prefetch endpoint routes
 * - Less granular cache control per query
 *
 * ### When to Use:
 * - Pages with predictable, static query patterns
 * - High-latency network environments
 * - When navigation performance is critical
 *
 * ### Standard Alternative:
 * For simpler cases, use TanStack Query's built-in prefetch:
 * ```tsx
 * queryClient.prefetchQuery({
 *   queryKey: ['users', id],
 *   queryFn: () => fetchUser(id)
 * })
 * ```
 */

type PrefetchMode = 'viewport' | 'intent'

type PrefetchLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> &
	LinkProps & {
		/**
		 * Controls when automatic prefetching should happen.
		 * - `intent` (default): Prefetch only when the user expresses intent
		 *   (hover/focus/mouse enter).
		 * - `viewport`: Prefetch as soon as the link is near the viewport.
		 */
		prefetchMode?: PrefetchMode
		/**
		 * Whether to call `router.prefetch` in addition to module/data preloading.
		 * Defaults to `false` to avoid duplicate full-page requests in development.
		 */
		enablePagePrefetch?: boolean
	}

type PrefetchResult = {
	success: boolean
	payload?: {
		queries?: Array<{ key: unknown[]; data: unknown }>
	}
}

const prefetchedPaths = new Map<string, Promise<void>>()

// Track ongoing prefetch operations to prevent rapid duplicate calls
const pendingPrefetches = new Map<string, number>()
const PREFETCH_DEBOUNCE_MS = 100

function toURL(href: LinkProps['href']): URL {
	if (typeof window === 'undefined') {
		// Should never happen in client component, but guard anyway.
		return new URL('about:blank')
	}
	if (typeof href === 'string') {
		return new URL(href, window.location.origin)
	}
	if (href instanceof URL) {
		return href
	}
	const base = window.location.origin
	const pathname = href.pathname ?? ''
	const url = new URL(pathname, base)
	if (href.query) {
		const params = url.searchParams
		for (const [key, value] of Object.entries(href.query)) {
			if (value === undefined || value === null) {
				continue
			}
			if (Array.isArray(value)) {
				for (const v of value) {
					params.append(key, String(v))
				}
			} else {
				params.set(key, String(value))
			}
		}
	}
	if (href.hash) {
		url.hash = href.hash
	}
	if (href.search) {
		url.search = href.search
	}
	return url
}

function cacheKeyFromUrl(url: URL): string {
	return `${url.pathname}${url.search}`
}

type ExecutePrefetchOptions = {
	router: ReturnType<typeof useRouter>
	queryClient: ReturnType<typeof useQueryClient>
	enablePagePrefetch: boolean
}

function executePrefetch(
	url: URL,
	{ router, queryClient, enablePagePrefetch }: ExecutePrefetchOptions
): Promise<void> {
	const key = cacheKeyFromUrl(url)
	const existing = prefetchedPaths.get(key)
	if (existing) {
		return existing
	}

	// Check if a prefetch was recently initiated for this URL
	const lastPrefetchTime = pendingPrefetches.get(key)
	if (
		lastPrefetchTime &&
		Date.now() - lastPrefetchTime < PREFETCH_DEBOUNCE_MS
	) {
		// Return a resolved promise to avoid blocking, actual prefetch is in progress
		return Promise.resolve()
	}

	pendingPrefetches.set(key, Date.now())

	const promise = (async () => {
		try {
			await preloadPathModules(url.pathname)
		} catch (_error) {
			// Silently ignore module preload errors
		}
		if (enablePagePrefetch) {
			try {
				await router.prefetch(`${url.pathname}${url.search}`)
			} catch (_error) {
				// Silently ignore router prefetch errors
			}
		}
		try {
			const apiPath =
				url.pathname === '/' ? '/api/prefetch' : `/api/prefetch${url.pathname}`
			const response = await fetch(`${apiPath}${url.search}`, {
				method: 'GET',
				credentials: 'same-origin',
				cache: 'no-store',
			})
			if (!response.ok) {
				return
			}
			const json = (await response.json()) as PrefetchResult
			if (!json?.success) {
				return
			}
			const queries = json.payload?.queries
			if (Array.isArray(queries)) {
				for (const query of queries) {
					if (Array.isArray(query.key)) {
						queryClient.setQueryData(query.key, query.data)
					}
				}
			}
		} catch (_error) {
			// Silently ignore API prefetch errors
		} finally {
			// Clean up pending prefetch tracking after a short delay
			setTimeout(() => pendingPrefetches.delete(key), PREFETCH_DEBOUNCE_MS * 2)
		}
	})()
	prefetchedPaths.set(key, promise)
	return promise
}

function assignRef<T>(ref: React.Ref<T> | undefined, value: T): void {
	if (!ref) {
		return
	}
	if (typeof ref === 'function') {
		ref(value)
	} else {
		;(ref as React.MutableRefObject<T>).current = value
	}
}

const PrefetchLink = ({
	prefetch,
	href,
	onMouseEnter,
	onFocus,
	prefetchMode = 'viewport',
	enablePagePrefetch = false,
	ref: forwardedRef,
	...rest
}: PrefetchLinkProps & { ref?: RefObject<HTMLAnchorElement | null> }) => {
	const router = useRouter()
	const queryClient = useQueryClient()
	const pathname = usePathname()
	const internalRef = useRef<HTMLAnchorElement | null>(null)

	const runPrefetch = useCallback(() => {
		if (prefetch === false) {
			return
		}
		const url = toURL(href)
		if (url.origin !== window.location.origin) {
			return
		}
		if (typeof window !== 'undefined') {
			const currentPath = window.location.pathname
			const currentSearch = window.location.search
			if (url.pathname === currentPath && url.search === currentSearch) {
				return
			}
		}
		if (url.pathname === pathname) {
			return
		}
		executePrefetch(url, {
			router,
			queryClient,
			enablePagePrefetch,
		}).catch((_error) => {
			// Silently ignore prefetch errors
		})
	}, [prefetch, href, router, queryClient, enablePagePrefetch, pathname])

	useEffect(() => {
		if (prefetch === false || prefetchMode !== 'viewport') {
			return
		}
		const element = internalRef.current
		if (!element) {
			return
		}
		// Use IntersectionObserver with rootMargin to prefetch slightly before viewport
		// This balances preloading with avoiding unnecessary requests
		const observer = new IntersectionObserver(
			(entries) => {
				const entry = entries[0]
				if (entry?.isIntersecting) {
					runPrefetch()
					observer.disconnect()
				}
			},
			{
				// Only trigger when element is about to enter viewport (200px before)
				rootMargin: '200px',
				// Require at least 10% of element to be visible to reduce false triggers
				threshold: 0.1,
			}
		)
		observer.observe(element)
		return () => observer.disconnect()
	}, [prefetch, prefetchMode, runPrefetch])

	const handleMouseEnter: React.MouseEventHandler<HTMLAnchorElement> = (
		event
	) => {
		runPrefetch()
		onMouseEnter?.(event)
	}

	const handleFocus: React.FocusEventHandler<HTMLAnchorElement> = (event) => {
		runPrefetch()
		onFocus?.(event)
	}

	return (
		<NextLink
			{...rest}
			href={href}
			onFocus={handleFocus}
			onMouseEnter={handleMouseEnter}
			// Disable Next.js built-in prefetch since we handle it manually
			// This prevents duplicate prefetch requests
			prefetch={false}
			ref={(node) => {
				internalRef.current = node
				assignRef(forwardedRef, node)
			}}
		/>
	)
}

PrefetchLink.displayName = 'PrefetchLink'

export { PrefetchLink }
