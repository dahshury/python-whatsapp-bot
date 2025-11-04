/**
 * WebSocket Adapter
 * Implements WebSocketPort by wrapping the existing WebSocket connection logic.
 * Provides a singleton instance managing a single shared WS connection.
 */

import type { WebSocketMessage, WebSocketPort } from '@/shared/ports'

type SubscriberCallback = (message: WebSocketMessage) => void

const WS_PING_INTERVAL_MS = 30_000
const WS_RECONNECT_INTERVAL_MS = 500

/**
 * Singleton WebSocket adapter managing a single connection across the app.
 * Multiple calls to subscribe return unsubscribe functions for cleanup.
 */
export class WebSocketAdapter implements WebSocketPort {
	private static instance: WebSocketAdapter
	private ws: WebSocket | null = null
	private readonly subscribers: Set<SubscriberCallback> = new Set()
	private isConnecting = false
	private _isConnected = false
	private reconnectAttempts = 0
	private readonly maxReconnectAttempts = Number.POSITIVE_INFINITY
	private readonly reconnectInterval = WS_RECONNECT_INTERVAL_MS
	private reconnectTimeout: NodeJS.Timeout | null = null
	private pingInterval: NodeJS.Timeout | null = null
	private wsUrl = ''

	private constructor() {
		this.resolveWebSocketUrl()
	}

	static getInstance(): WebSocketAdapter {
		if (!WebSocketAdapter.instance) {
			WebSocketAdapter.instance = new WebSocketAdapter()
		}
		return WebSocketAdapter.instance
	}

	private resolveWebSocketUrl(): void {
		const isServer = typeof window === 'undefined'
		if (isServer) {
			this.wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://backend:8001'
		} else {
			this.wsUrl =
				(process.env.NEXT_PUBLIC_WS_URL as string) || 'ws://localhost:8001'
		}
	}

	connect(): Promise<void> {
		if (this.ws?.readyState === WebSocket.OPEN) {
			return Promise.resolve()
		}

		if (this.isConnecting) {
			return Promise.resolve()
		}

		this.isConnecting = true

		try {
			this.ws = new WebSocket(this.wsUrl)

			this.ws.onopen = () => {
				this._isConnected = true
				this.isConnecting = false
				this.reconnectAttempts = 0
				this.setupHeartbeat()
			}

			this.ws.onmessage = (event) => {
				try {
					const message: WebSocketMessage = JSON.parse(event.data)
					this.notifySubscribers(message)
				} catch {
					// Message parse failed; silently ignore
				}
			}

			this.ws.onclose = () => {
				this._isConnected = false
				this.isConnecting = false
				this.clearHeartbeat()
				this.scheduleReconnect()
			}

			this.ws.onerror = () => {
				this.isConnecting = false
				this.clearHeartbeat()
			}
			return Promise.resolve()
		} catch (error) {
			this.isConnecting = false
			this.scheduleReconnect()
			return Promise.reject(error)
		}
	}

	disconnect(): Promise<void> {
		if (this.reconnectTimeout) {
			clearTimeout(this.reconnectTimeout)
			this.reconnectTimeout = null
		}

		this.clearHeartbeat()

		if (this.ws) {
			try {
				this.ws.close()
			} catch {
				// Ignore close errors
			}
			this.ws = null
		}

		this._isConnected = false
		this.isConnecting = false
		this.reconnectAttempts = 0
		return Promise.resolve()
	}

	send(message: WebSocketMessage): Promise<boolean> {
		if (this._isConnected && this.ws) {
			try {
				this.ws.send(JSON.stringify(message))
				return Promise.resolve(true)
			} catch {
				return Promise.resolve(false)
			}
		}
		return Promise.resolve(false)
	}

	subscribe(callback: SubscriberCallback): () => void {
		this.subscribers.add(callback)

		const shouldConnect = this.subscribers.size === 1
		if (shouldConnect) {
			this.connect().catch(() => {
				// Connection errors will trigger auto-reconnect
			})
		}

		// Return unsubscribe function
		return () => {
			this.subscribers.delete(callback)
			if (this.subscribers.size !== 0) {
				return
			}
			this.disconnect().catch(() => {
				// Ignore disconnect errors
			})
		}
	}

	isConnected(): boolean {
		return this._isConnected
	}

	private notifySubscribers(message: WebSocketMessage): void {
		for (const subscriber of this.subscribers) {
			try {
				subscriber(message)
			} catch {
				// Ignore subscriber errors
			}
		}
	}

	private setupHeartbeat(): void {
		this.clearHeartbeat()
		this.pingInterval = setInterval(() => {
			if (this.ws?.readyState === WebSocket.OPEN) {
				try {
					this.ws.send(JSON.stringify({ type: 'ping' }))
				} catch {
					// Ping failed; will reconnect on close
				}
			}
		}, WS_PING_INTERVAL_MS)
	}

	private clearHeartbeat(): void {
		if (this.pingInterval) {
			clearInterval(this.pingInterval)
			this.pingInterval = null
		}
	}

	private scheduleReconnect(): void {
		if (this.reconnectAttempts >= this.maxReconnectAttempts) {
			return
		}

		if (this.reconnectTimeout) {
			return
		}

		this.reconnectAttempts += 1
		this.reconnectTimeout = setTimeout(() => {
			this.reconnectTimeout = null
			this.connect().catch(() => {
				// Will retry on next schedule
			})
		}, this.reconnectInterval)
	}
}

// Singleton instance
export const wsAdapter = WebSocketAdapter.getInstance()
