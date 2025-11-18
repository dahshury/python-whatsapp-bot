import { useEffect } from 'react'
import { persistState } from '@/shared/libs/ws/cache'
import { connectionManager } from '@/shared/libs/ws/connection-manager'
import type { WebSocketDataState } from '@/shared/libs/ws/types'

export type ConnectionLifecycleCallbacks = {
	getWsRef: () => React.MutableRefObject<WebSocket | null>
	getReconnectTimeoutRef: () => React.MutableRefObject<NodeJS.Timeout | null>
	getIsConnectedRef: () => React.MutableRefObject<boolean>
	getInstanceIdRef: () => React.MutableRefObject<number>
	connect: () => void
	disconnect: () => void
	state: WebSocketDataState
}

/**
 * Custom hook to manage WebSocket connection lifecycle:
 * - Subscriber tracking
 * - Snapshot requests on mount
 * - Online/visibility event listeners
 * - Delayed disconnect on unmount
 * - State persistence
 */
export function useWebSocketLifecycle(
	callbacks: ConnectionLifecycleCallbacks
): void {
	const {
		getWsRef,
		getReconnectTimeoutRef,
		getIsConnectedRef,
		connect,
		disconnect,
		state,
	} = callbacks

	const wsRef = getWsRef()
	const reconnectTimeoutRef = getReconnectTimeoutRef()
	const isConnectedRef = getIsConnectedRef()

	// Initialize WebSocket connection immediately (no artificial delay)
	useEffect(() => {
		// Track subscribers and ensure a single shared connection
		connectionManager.subscribers += 1
		connect()

		// Request snapshot aggressively for faster load
		const requestSnapshot = () => {
			if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
				wsRef.current.send(JSON.stringify({ type: 'get_snapshot' }))
			}
		}

		// Multiple snapshot requests to ensure fast data load
		const SNAPSHOT_REQUEST_DELAY_1_MS = 50
		const SNAPSHOT_REQUEST_DELAY_2_MS = 200
		const SNAPSHOT_REQUEST_DELAY_3_MS = 500
		setTimeout(requestSnapshot, SNAPSHOT_REQUEST_DELAY_1_MS)
		setTimeout(requestSnapshot, SNAPSHOT_REQUEST_DELAY_2_MS)
		setTimeout(requestSnapshot, SNAPSHOT_REQUEST_DELAY_3_MS)

		const handleOnline = () => {
			if (!isConnectedRef.current) {
				connect()
			}
		}
		const handleVisibility = () => {
			try {
				if (document.visibilityState === 'visible' && !isConnectedRef.current) {
					connect()
				}
			} catch {
				// Silently fail if visibility handling fails
			}
		}
		window.addEventListener('online', handleOnline)
		document.addEventListener('visibilitychange', handleVisibility)

		return () => {
			connectionManager.subscribers = Math.max(
				0,
				connectionManager.subscribers - 1
			)

			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current)
				reconnectTimeoutRef.current = null
			}
			window.removeEventListener('online', handleOnline)
			document.removeEventListener('visibilitychange', handleVisibility)

			// Only disconnect if no more subscribers remain. Delay slightly to avoid StrictMode double-unmount glitches
			if (connectionManager.pendingDisconnect) {
				clearTimeout(connectionManager.pendingDisconnect)
				connectionManager.pendingDisconnect = null
			}
			if (!connectionManager.subscribers) {
				const DISCONNECT_DELAY_MS = 500
				connectionManager.pendingDisconnect = setTimeout(() => {
					if (!connectionManager.subscribers) {
						disconnect()
					}
					connectionManager.pendingDisconnect = null
				}, DISCONNECT_DELAY_MS)
			}
		}
	}, [
		connect,
		disconnect,
		isConnectedRef.current,
		reconnectTimeoutRef,
		wsRef.current,
	]) // Keep stable to avoid reconnect/disconnect loop on state changes

	// Cleanup on unmount
	useEffect(
		() => () => {
			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current)
			}
		},
		[reconnectTimeoutRef]
	)

	// Persist snapshot to sessionStorage to avoid blank UI on refresh
	useEffect(() => {
		try {
			persistState(state)
		} catch {
			// Silently fail if state persistence fails
		}
	}, [
		state.reservations,
		state.conversations,
		state.vacations,
		state.lastUpdate,
		state,
	])
}
