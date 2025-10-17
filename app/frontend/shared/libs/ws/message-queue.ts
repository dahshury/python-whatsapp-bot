// Minimal shared WebSocket message queue utilities

type WebSocketMessage = {
	type: string;
	data?: Record<string, unknown>;
};

type QueuedMessage = {
	message: WebSocketMessage;
	resolve: (success: boolean) => void;
	timestamp: number;
};

const messageQueue: QueuedMessage[] = [];
const QUEUE_TIMEOUT_MS = 10_000; // 10 seconds
const QUEUE_PROCESS_INTERVAL_MS = 500; // Process queue every 500ms

function processMessageQueue(): void {
	try {
		const socket = (globalThis as { __wsConnection?: { current?: WebSocket } })
			.__wsConnection?.current;
		if (!socket || socket.readyState !== WebSocket.OPEN) {
			return;
		}

		const now = Date.now();
		while (messageQueue.length > 0) {
			const queued = messageQueue.shift();
			if (!queued) {
				break;
			}
			if (now - queued.timestamp > QUEUE_TIMEOUT_MS) {
				queued.resolve(false);
				continue;
			}
			try {
				socket.send(JSON.stringify(queued.message));
				queued.resolve(true);
			} catch {
				queued.resolve(false);
			}
		}
	} catch {
		// Connection check failed; queue will be retried on next interval
	}
}

// Periodically check for connection and process queue (once per app runtime)
try {
	const g = globalThis as { __wsQueueSetup?: boolean };
	if (typeof g !== "undefined" && !g.__wsQueueSetup) {
		g.__wsQueueSetup = true;
		setInterval(() => processMessageQueue(), QUEUE_PROCESS_INTERVAL_MS);
	}
} catch {
	// Global setup failed; queue will not be processed automatically
}

export function sendWebSocketMessage(
	message: WebSocketMessage
): Promise<boolean> {
	return new Promise((resolve) => {
		try {
			const socket = (
				globalThis as { __wsConnection?: { current?: WebSocket } }
			).__wsConnection?.current;
			if (socket?.readyState === WebSocket.OPEN) {
				try {
					socket.send(JSON.stringify(message));
					resolve(true);
					return;
				} catch {
					// Send failed; will be queued for later processing
				}
			}
			// CONNECTING, CLOSING, CLOSED, or no socket: enqueue and resolve when processed
			messageQueue.push({ message, resolve, timestamp: Date.now() });
		} catch {
			resolve(false);
		}
	});
}
