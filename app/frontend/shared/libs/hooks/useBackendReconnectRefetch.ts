import { useEffect, useRef } from 'react'
import type { BackendConnectionStatus } from '@/shared/libs/backend-connection-store'
import { backendConnectionStore } from '@/shared/libs/backend-connection-store'

type Awaitable<voidReturn> = voidReturn | Promise<voidReturn>

type UseBackendReconnectRefetchOptions = {
	/**
	 * When false, the hook does nothing.
	 * Useful for skipping refetch logic while a query is already running.
	 */
	enabled?: boolean
}

/**
 * Subscribes to backend connection status changes and triggers refetch callbacks
 * whenever the connection transitions from a non-connected state back to connected.
 *
 * Designed for use alongside TanStack Query hooks to ensure data that failed to
 * load while the backend was unavailable is re-requested automatically as soon
 * as the connection is restored.
 *
 * ## Why This Custom Hook Instead of TanStack Query's Built-in Features?
 *
 * TanStack Query provides `networkMode` and `retry` options, but they only detect
 * browser online/offline events. This hook is necessary because:
 *
 * 1. **Backend-Specific Connection Tracking**: Monitors actual backend connectivity,
 *    not just browser network state. The backend might be down while the browser
 *    shows "online".
 *
 * 2. **Sophisticated Failure Detection**: Uses consecutive failure tracking, grace
 *    periods, debouncing, and WebSocket awareness. Handles slow EC2 instances and
 *    prevents false positives.
 *
 * 3. **Connection State Granularity**: Distinguishes between "connected", "checking",
 *    and "disconnected" states with failure reason tracking.
 *
 * 4. **No Aggressive Retries**: TanStack Query's retry would hammer a failing backend.
 *    This hook waits for confirmed reconnection before refetching.
 *
 * See: `backend-connection-store.ts` for the connection tracking implementation.
 */
export function useBackendReconnectRefetch(
	refetch: () => Awaitable<unknown>,
	options?: UseBackendReconnectRefetchOptions
): void {
	const enabled = options?.enabled ?? true
	const refetchRef = useRef(refetch)
	const enabledRef = useRef(enabled)

	useEffect(() => {
		refetchRef.current = refetch
	}, [refetch])

	useEffect(() => {
		enabledRef.current = enabled
	}, [enabled])

	useEffect(() => {
		if (typeof window === 'undefined') {
			return
		}

		let previousStatus: BackendConnectionStatus =
			backendConnectionStore.getSnapshot().status

		const unsubscribe = backendConnectionStore.subscribe(() => {
			const snapshot = backendConnectionStore.getSnapshot()
			const nextStatus = snapshot.status

			const transitionedToConnected =
				previousStatus !== 'connected' && nextStatus === 'connected'

			if (transitionedToConnected && enabledRef.current) {
				try {
					const result = refetchRef.current()
					if (
						result &&
						typeof (result as Promise<unknown>).then === 'function'
					) {
						;(result as Promise<unknown>).catch(() => {
							// Swallow refetch errors - the owning query will surface them
						})
					}
				} catch {
					// Swallow synchronous refetch errors - query handles reporting
				}
			}

			previousStatus = nextStatus
		})

		return () => {
			unsubscribe()
		}
	}, [])
}
