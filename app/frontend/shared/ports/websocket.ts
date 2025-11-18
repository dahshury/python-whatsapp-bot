/**
 * WebSocket Port (Hexagonal Architecture)
 * Defines the contract for WebSocket communication independent of implementation.
 */

export type WebSocketMessage = {
	type: string
	data?: unknown
}

export type WebSocketPort = {
	connect(): Promise<void>
	disconnect(): Promise<void>
	send(message: WebSocketMessage): Promise<boolean>
	subscribe(callback: (message: WebSocketMessage) => void): () => void // returns unsubscribe function
	isConnected(): boolean
}
