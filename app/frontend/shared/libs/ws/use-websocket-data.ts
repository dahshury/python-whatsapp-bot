import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { loadCachedState } from '@/shared/libs/ws/cache'
import { WebSocketConnectionHandler } from '@/shared/libs/ws/connection-handler'
import { connectionManager } from '@/shared/libs/ws/connection-manager'
import type {
	UseWebSocketDataOptions,
	WebSocketDataState,
	WebSocketMessage,
} from '@/shared/libs/ws/types'
import { useWebSocketLifecycle } from '@/shared/libs/ws/use-connection-lifecycle'
import { createVacationUpdateHandler } from '@/shared/libs/ws/vacation-update-handler'

// Toggle verbose WebSocket error logging via env flag (default: off)
const WS_DEBUG = process.env.NEXT_PUBLIC_WS_DEBUG === 'true'

let nextInstanceId = 1

export function useWebSocketData(options: UseWebSocketDataOptions = {}) {
	const {
		autoReconnect = true,
		maxReconnectAttempts = Number.POSITIVE_INFINITY,
		reconnectInterval = 500, // Faster reconnection for quicker data load
		enableNotifications: _enableNotifications = true,
		filters,
	} = options

	// Stable per-mount instance id for debugging (only log in dev mode with WS_DEBUG=true)
	const instanceIdRef = useRef<number>(0)
	if (instanceIdRef.current === 0) {
		instanceIdRef.current = nextInstanceId
		nextInstanceId += 1
	}
	if (WS_DEBUG) {
		// Debug logging can be added here if needed
	}

	// Cache TTL (keep last good snapshot to avoid UI flicker on refresh)
	const SECONDS_PER_MINUTE = 60
	const MINUTES_PER_HOUR = 60
	const MILLISECONDS_PER_SECOND = 1000
	const ONE_HOUR_MS =
		SECONDS_PER_MINUTE * MINUTES_PER_HOUR * MILLISECONDS_PER_SECOND
	const CACHE_TTL_MS = ONE_HOUR_MS

	const [state, setState] = useState<WebSocketDataState>(() =>
		loadCachedState(CACHE_TTL_MS)
	)

	const wsRef = useRef<WebSocket | null>(null)
	const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	const reconnectAttemptsRef = useRef(0)
	const messageQueueRef = useRef<WebSocketMessage[]>([])
	const connectingRef = useRef(false) // Prevent multiple connection attempts
	const isConnectedRef = useRef(false)
	const pingIntervalRef = useRef<NodeJS.Timeout | null>(null)

	useEffect(() => {
		isConnectedRef.current = state.isConnected
	}, [state.isConnected])

	// Create connection handler instance
	const connectionHandlerRef = useRef<WebSocketConnectionHandler | null>(null)
	if (!connectionHandlerRef.current) {
		connectionHandlerRef.current = new WebSocketConnectionHandler(
			{
				setState,
				getWsRef: () => wsRef,
				getReconnectTimeoutRef: () => reconnectTimeoutRef,
				getReconnectAttemptsRef: () => reconnectAttemptsRef,
				getMessageQueueRef: () => messageQueueRef,
				getConnectingRef: () => connectingRef,
				getPingIntervalRef: () => pingIntervalRef,
				getInstanceIdRef: () => instanceIdRef,
			},
			{
				autoReconnect,
				maxReconnectAttempts,
				reconnectInterval,
				...(filters !== undefined && { filters }),
			}
		)
	}

	// Connect to WebSocket - delegate to connection handler
	const connect = useCallback(() => {
		connectionHandlerRef.current?.connect()
	}, [])

	// Disconnect WebSocket
	const disconnect = useCallback(() => {
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current)
			reconnectTimeoutRef.current = null
		}

		if (wsRef.current) {
			try {
				;(wsRef.current as WebSocket).onclose = null
			} catch {
				// Silently fail if cleanup fails
			}
			try {
				;(wsRef.current as WebSocket).onerror = null
			} catch {
				// Silently fail if cleanup fails
			}
			try {
				;(wsRef.current as WebSocket).onopen = null
			} catch {
				// Silently fail if cleanup fails
			}
			try {
				;(wsRef.current as WebSocket).onmessage = null
			} catch {
				// Silently fail if cleanup fails
			}
			if (pingIntervalRef.current) {
				clearInterval(pingIntervalRef.current)
				pingIntervalRef.current = null
			}
			// Normal close; prevent auto-reconnect handler from scheduling
			const WEBSOCKET_NORMAL_CLOSE_CODE = 1000
			wsRef.current.close(WEBSOCKET_NORMAL_CLOSE_CODE, 'Manual disconnect')
			// Clear global instance if this was it
			if (connectionManager.instance === wsRef.current) {
				connectionManager.instance = null
			}
			wsRef.current = null
		}

		// Clear global lock and state
		connectionManager.lock = false
		setState((prev) => ({ ...prev, isConnected: false }))
	}, [])

	// Manual refresh now re-requests a snapshot via WebSocket only (no REST fallback)
	const refreshData = useCallback(() => {
		try {
			if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
				wsRef.current.send(JSON.stringify({ type: 'get_snapshot' }))
			} else {
				// Try to reconnect and then request snapshot
				connect()
				const SNAPSHOT_REQUEST_DELAY_MS = 500
				setTimeout(() => {
					try {
						wsRef.current?.send(JSON.stringify({ type: 'get_snapshot' }))
					} catch {
						// Silently fail if snapshot request fails
					}
				}, SNAPSHOT_REQUEST_DELAY_MS)
			}
		} catch {
			// Silently fail if refresh fails
		}
	}, [connect])

	// Send vacation update to backend via WebSocket only - use extracted handler
	const sendVacationUpdate = useCallback(
		createVacationUpdateHandler({
			getWsRef: () => wsRef,
			connect,
		}),
		[]
	)

	// Use lifecycle hook for initialization, cleanup, and persistence
	useWebSocketLifecycle({
		getWsRef: () => wsRef,
		getReconnectTimeoutRef: () => reconnectTimeoutRef,
		getIsConnectedRef: () => isConnectedRef,
		getInstanceIdRef: () => instanceIdRef,
		connect,
		disconnect,
		state,
	})

	return useMemo(
		() => ({
			// Data
			reservations: state.reservations,
			conversations: state.conversations,
			vacations: state.vacations,

			// Connection state
			isConnected: state.isConnected,
			lastUpdate: state.lastUpdate,

			// Actions
			connect,
			disconnect,
			refreshData,
			sendVacationUpdate,

			// Utility
			isReconnecting: reconnectAttemptsRef.current > 0 && !state.isConnected,
		}),
		[
			state.reservations,
			state.conversations,
			state.vacations,
			state.isConnected,
			state.lastUpdate,
			connect,
			disconnect,
			refreshData,
			sendVacationUpdate,
		]
	)
}
