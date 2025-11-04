'use client'

import { useQueryClient } from '@tanstack/react-query'
import NextLink, { type LinkProps } from 'next/link'
import { useRouter } from 'next/navigation'
import {
	type AnchorHTMLAttributes,
	forwardRef,
	useCallback,
	useEffect,
	useRef,
} from 'react'
import { preloadPathModules } from '@/shared/libs/prefetch/registry'

type PrefetchLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & LinkProps

type PrefetchResult = {
	success: boolean
	payload?: {
		queries?: Array<{ key: unknown[]; data: unknown }>
	}
}

const prefetchedPaths = new Map<string, Promise<void>>()

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

function executePrefetch(
	url: URL,
	router: ReturnType<typeof useRouter>,
	queryClient: ReturnType<typeof useQueryClient>
): Promise<void> {
	const key = cacheKeyFromUrl(url)
	if (!prefetchedPaths.has(key)) {
		const promise = (async () => {
			try {
				await preloadPathModules(url.pathname)
			} catch (_error) {
				// Silently ignore module preload errors
			}
			try {
				await router.prefetch(`${url.pathname}${url.search}`)
			} catch (_error) {
				// Silently ignore router prefetch errors
			}
			try {
				const apiPath =
					url.pathname === '/'
						? '/api/prefetch'
						: `/api/prefetch${url.pathname}`
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
			}
		})()
		prefetchedPaths.set(key, promise)
	}
	return prefetchedPaths.get(key) as Promise<void>
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

const PrefetchLink = forwardRef<HTMLAnchorElement, PrefetchLinkProps>(
	({ prefetch, href, onMouseEnter, onFocus, ...rest }, forwardedRef) => {
		const router = useRouter()
		const queryClient = useQueryClient()
		const internalRef = useRef<HTMLAnchorElement | null>(null)

		const runPrefetch = useCallback(() => {
			if (prefetch === false) {
				return
			}
			const url = toURL(href)
			if (url.origin !== window.location.origin) {
				return
			}
			executePrefetch(url, router, queryClient).catch((_error) => {
				// Silently ignore prefetch errors
			})
		}, [prefetch, href, router, queryClient])

		useEffect(() => {
			if (prefetch === false) {
				return
			}
			const element = internalRef.current
			if (!element) {
				return
			}
			const observer = new IntersectionObserver((entries) => {
				const entry = entries[0]
				if (entry?.isIntersecting) {
					runPrefetch()
					observer.disconnect()
				}
			})
			observer.observe(element)
			return () => observer.disconnect()
		}, [prefetch, runPrefetch])

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
				{...(prefetch !== undefined ? { prefetch } : {})}
				ref={(node) => {
					internalRef.current = node
					assignRef(forwardedRef, node)
				}}
			/>
		)
	}
)

PrefetchLink.displayName = 'PrefetchLink'

export { PrefetchLink }
