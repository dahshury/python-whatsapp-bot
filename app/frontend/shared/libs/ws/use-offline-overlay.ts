import { useCallback, useEffect, useRef, useState } from 'react'

type OfflineOverlayState = {
	showOffline: boolean
	isRetrying: boolean
	handleRetry: () => void
}

type MaybeWS = {
	isConnected?: boolean
	connect?: () => void
	conversations?: unknown
	reservations?: unknown
	vacations?: unknown
}

// Offline overlay delay thresholds in milliseconds
const OFFLINE_THRESHOLD_WITH_DATA_MS = 6000
const OFFLINE_THRESHOLD_WITHOUT_DATA_MS = 2000
const RETRY_TIMEOUT_MS = 2500

export function useOfflineOverlay(
	ws: MaybeWS | null | undefined
): OfflineOverlayState {
	const [showOffline, setShowOffline] = useState<boolean>(false)
	const [isRetrying, setIsRetrying] = useState<boolean>(false)
	const disconnectedSinceRef = useRef<number | null>(null)
	const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)

	// Extract specific properties for stable dependencies
	const isConnected = ws?.isConnected
	const reservations = ws?.reservations
	const conversations = ws?.conversations
	const vacations = ws?.vacations
	const connect = ws?.connect

	useEffect(() => {
		const hasAnyData = (() => {
			try {
				const resv = reservations || {}
				const conv = conversations || {}
				const vac = vacations || []
				return (
					Object.keys(resv as Record<string, unknown>).length > 0 ||
					Object.keys(conv as Record<string, unknown>).length > 0 ||
					(Array.isArray(vac) ? (vac as unknown[]).length : 0) > 0
				)
			} catch {
				return false
			}
		})()

		const isConnecting = (() => {
			try {
				const ref = (globalThis as { __wsConnection?: { current?: WebSocket } })
					.__wsConnection
				return ref?.current?.readyState === WebSocket.CONNECTING
			} catch {
				return false
			}
		})()

		if (isConnected || isConnecting) {
			disconnectedSinceRef.current = null
			setShowOffline(false)
			return
		}

		if (disconnectedSinceRef.current == null) {
			disconnectedSinceRef.current = Date.now()
		}
		const elapsed = Date.now() - (disconnectedSinceRef.current || Date.now())
		const thresholdMs = hasAnyData
			? OFFLINE_THRESHOLD_WITH_DATA_MS
			: OFFLINE_THRESHOLD_WITHOUT_DATA_MS
		const t = setTimeout(
			() => {
				const stillDisconnected = !isConnected
				if (stillDisconnected) {
					setShowOffline(true)
				}
			},
			Math.max(0, thresholdMs - elapsed)
		)
		return () => clearTimeout(t)
	}, [isConnected, reservations, conversations, vacations])

	const handleRetry = useCallback(() => {
		if (isRetrying) {
			return
		}
		setIsRetrying(true)
		if (retryTimeoutRef.current) {
			clearTimeout(retryTimeoutRef.current)
			retryTimeoutRef.current = null
		}
		try {
			connect?.()
		} catch {
			// Connection attempt failed - retry timeout will reset state
		}
		retryTimeoutRef.current = setTimeout(() => {
			setIsRetrying(false)
			retryTimeoutRef.current = null
		}, RETRY_TIMEOUT_MS)
	}, [connect, isRetrying])

	useEffect(() => {
		if (isRetrying && isConnected) {
			setIsRetrying(false)
			if (retryTimeoutRef.current) {
				clearTimeout(retryTimeoutRef.current)
				retryTimeoutRef.current = null
			}
		}
	}, [isRetrying, isConnected])

	useEffect(
		() => () => {
			if (retryTimeoutRef.current) {
				clearTimeout(retryTimeoutRef.current)
				retryTimeoutRef.current = null
			}
		},
		[]
	)

	return { showOffline, isRetrying, handleRetry }
}
