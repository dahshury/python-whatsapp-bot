// Global/shared state to coordinate a single WS connection across subscribers and bundles
// Store on globalThis to avoid duplicate sockets when modules are bundled separately (StrictMode/HMR/routes)
const __g =
	(globalThis as unknown as {
		__wsLock?: boolean
		__wsInstance?: WebSocket | null
		__wsConnectTs?: number
		__wsSubs?: number
		__wsPendingDisconnect?: ReturnType<typeof setTimeout> | null
	}) || {}

if (typeof globalThis !== 'undefined') {
	if (typeof __g.__wsLock !== 'boolean') {
		__g.__wsLock = false
	}
	if (typeof __g.__wsInstance === 'undefined') {
		__g.__wsInstance = null
	}
	if (typeof __g.__wsConnectTs !== 'number') {
		__g.__wsConnectTs = 0
	}
	if (typeof __g.__wsSubs !== 'number') {
		__g.__wsSubs = 0
	}
}

export const connectionManager = {
	get lock(): boolean {
		return Boolean(__g.__wsLock)
	},
	set lock(value: boolean) {
		__g.__wsLock = value
	},
	get instance(): WebSocket | null {
		return (__g.__wsInstance as WebSocket | null) || null
	},
	set instance(value: WebSocket | null) {
		__g.__wsInstance = value
	},
	get connectTs(): number {
		return (__g.__wsConnectTs as number) || 0
	},
	set connectTs(value: number) {
		__g.__wsConnectTs = value
	},
	get subscribers(): number {
		return (__g.__wsSubs as number) || 0
	},
	set subscribers(value: number) {
		__g.__wsSubs = value
	},
	get pendingDisconnect(): ReturnType<typeof setTimeout> | null {
		return (
			(__g.__wsPendingDisconnect as ReturnType<typeof setTimeout> | null) ||
			null
		)
	},
	set pendingDisconnect(value: ReturnType<typeof setTimeout> | null) {
		__g.__wsPendingDisconnect = value
	},
}
