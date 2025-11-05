import type { WebSocketMessage } from "./types";

type QueuedMessage = {
  message: WebSocketMessage;
  resolve: (success: boolean) => void;
  timestamp: number;
};

const messageQueue: QueuedMessage[] = [];
const QUEUE_TIMEOUT_MS = 10_000;

export function processMessageQueue(): void {
  const wsRef = (globalThis as { __wsConnection?: { current?: WebSocket } })
    .__wsConnection;
  if (!wsRef?.current || wsRef.current.readyState !== WebSocket.OPEN) {
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
      wsRef.current.send(JSON.stringify(queued.message));
      queued.resolve(true);
    } catch {
      queued.resolve(false);
    }
  }
}

let queueSetup = false;

const CONNECTION_CHECK_INTERVAL_MS = 500;

export function ensureQueueProcessor(): void {
  if (queueSetup) {
    return;
  }
  queueSetup = true;
  setInterval(() => {
    const wsRef = (globalThis as { __wsConnection?: { current?: WebSocket } })
      .__wsConnection;
    if (
      wsRef?.current?.readyState === WebSocket.OPEN &&
      messageQueue.length > 0
    ) {
      processMessageQueue();
    }
  }, CONNECTION_CHECK_INTERVAL_MS);
}

export function sendWebSocketMessage(
  message: WebSocketMessage
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    try {
      const wsRef = (globalThis as { __wsConnection?: { current?: WebSocket } })
        .__wsConnection;
      if (wsRef?.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(message));
        resolve(true);
      } else {
        messageQueue.push({ message, resolve, timestamp: Date.now() });
      }
    } catch {
      resolve(false);
    }
  });
}
