import type React from "react";
import { reduceOnMessage } from "@/shared/libs/ws/reducer";
import type {
  WebSocketDataState,
  WebSocketMessage,
} from "@/shared/libs/ws/types";
import { setWindowProperty } from "@/shared/libs/ws/window-helpers";

export type ProcessMessageCallbacks = {
  setState: React.Dispatch<React.SetStateAction<WebSocketDataState>>;
  getMessageQueueRef?: () => React.MutableRefObject<WebSocketMessage[]>;
};

export function processWebSocketMessage(
  message: WebSocketMessage,
  callbacks: ProcessMessageCallbacks
): void {
  const { type, data } = message;

  callbacks.setState((prev) => reduceOnMessage(prev, message));

  // Clear message queue on snapshot if callback provided
  if (type === "snapshot" && callbacks.getMessageQueueRef) {
    callbacks.getMessageQueueRef().current = [];
  }

  // Metrics and realtime event fan-out
  try {
    const payload = data as { metrics?: Record<string, unknown> };
    if (type === "metrics_updated" || type === "snapshot") {
      setWindowProperty("__prom_metrics__", payload.metrics || {});
    }
  } catch {
    // Metrics update failed - continue processing message
  }
  try {
    setTimeout(() => {
      try {
        // Pass the entire message to preserve all fields (error, timestamp, etc.)
        const evt = new CustomEvent("realtime", { detail: message });
        window.dispatchEvent(evt);
      } catch {
        // Event dispatch failed - realtime event may be lost
      }
    }, 0);
  } catch {
    // setTimeout setup failed - realtime event dispatch skipped
  }

  // Do not call notifyUpdate here to avoid duplicate toasts; handled via RealtimeEventBus -> ToastRouter
}
