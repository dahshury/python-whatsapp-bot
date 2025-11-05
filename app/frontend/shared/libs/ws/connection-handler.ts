import type React from "react";
import { connectionManager } from "@/shared/libs/ws/connection-manager";
import { processWebSocketMessage } from "@/shared/libs/ws/message-processor";
import { calculateReconnectionDelay } from "@/shared/libs/ws/reconnection-strategy";
import type {
  UseWebSocketDataOptions,
  WebSocketDataState,
  WebSocketMessage,
} from "@/shared/libs/ws/types";
import { resolveWebSocketUrl } from "@/shared/libs/ws/url";
import { setWindowProperty } from "@/shared/libs/ws/window-helpers";

// Toggle verbose WebSocket error logging via env flag (default: off)
const WS_DEBUG = process.env.NEXT_PUBLIC_WS_DEBUG === "true";

// Default reconnection interval in milliseconds
const DEFAULT_RECONNECT_INTERVAL_MS = 500;

// WebSocket close code constants
const WS_CLOSE_NORMAL = 1000;
const PING_INTERVAL_MS = 25_000;

export type ConnectionHandlerCallbacks = {
  setState: React.Dispatch<React.SetStateAction<WebSocketDataState>>;
  getWsRef: () => React.MutableRefObject<WebSocket | null>;
  getReconnectTimeoutRef: () => React.MutableRefObject<NodeJS.Timeout | null>;
  getReconnectAttemptsRef: () => React.MutableRefObject<number>;
  getMessageQueueRef: () => React.MutableRefObject<WebSocketMessage[]>;
  getConnectingRef: () => React.MutableRefObject<boolean>;
  getPingIntervalRef: () => React.MutableRefObject<NodeJS.Timeout | null>;
  getInstanceIdRef: () => React.MutableRefObject<number>;
};

export class WebSocketConnectionHandler {
  private readonly callbacks: ConnectionHandlerCallbacks;
  private readonly options: Required<
    Pick<
      UseWebSocketDataOptions,
      "autoReconnect" | "maxReconnectAttempts" | "reconnectInterval"
    >
  > & {
    filters?: UseWebSocketDataOptions["filters"];
  };

  constructor(
    callbacks: ConnectionHandlerCallbacks,
    options: UseWebSocketDataOptions
  ) {
    this.callbacks = callbacks;
    this.options = {
      autoReconnect: options.autoReconnect ?? true,
      maxReconnectAttempts:
        options.maxReconnectAttempts ?? Number.POSITIVE_INFINITY,
      reconnectInterval:
        options.reconnectInterval ?? DEFAULT_RECONNECT_INTERVAL_MS,
      filters: options.filters,
    };
  }

  connect(): void {
    const wsRef = this.callbacks.getWsRef();
    const reconnectTimeoutRef = this.callbacks.getReconnectTimeoutRef();
    const reconnectAttemptsRef = this.callbacks.getReconnectAttemptsRef();
    const messageQueueRef = this.callbacks.getMessageQueueRef();
    const connectingRef = this.callbacks.getConnectingRef();
    const pingIntervalRef = this.callbacks.getPingIntervalRef();
    const { setState } = this.callbacks;
    const { autoReconnect, maxReconnectAttempts, reconnectInterval, filters } =
      this.options;

    // First check if there's already a working or connecting global instance
    if (
      connectionManager.instance &&
      [WebSocket.OPEN, WebSocket.CONNECTING].includes(
        connectionManager.instance.readyState as 0 | 1
      )
    ) {
      const ws = connectionManager.instance;
      wsRef.current = ws;
      // Ensure global window reference is set even when reusing an already-open instance
      try {
        setWindowProperty("__wsConnection", wsRef);
      } catch {
        // Window property set failed - continue with connection
      }
      // Rebind handlers to this hook instance to avoid stale closures after StrictMode remounts
      try {
        ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            processWebSocketMessage(message, {
              setState,
              getMessageQueueRef: () => messageQueueRef,
            });
          } catch {
            // Message processing failed - skip this message
          }
        };
        ws.onclose = (event: CloseEvent) => {
          setState((prev: WebSocketDataState) => ({
            ...prev,
            isConnected: false,
          }));
          if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = null;
          }
          if (wsRef.current === ws) {
            wsRef.current = null;
          }
          if (connectionManager.instance === ws) {
            if (WS_DEBUG) {
              // Debug logging would go here if enabled
            }
            connectionManager.instance = null;
          }
          connectionManager.lock = false;
          try {
            setWindowProperty("__wsConnection", null);
          } catch {
            // Window property clear failed - continue cleanup
          }
          connectingRef.current = false;

          if (
            autoReconnect &&
            event.code !== WS_CLOSE_NORMAL &&
            reconnectAttemptsRef.current < maxReconnectAttempts
          ) {
            reconnectAttemptsRef.current += 1;
            const delay = calculateReconnectionDelay(
              reconnectInterval,
              reconnectAttemptsRef.current
            );
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
            }
            reconnectTimeoutRef.current = setTimeout(() => {
              this.connect();
            }, delay);
          }
        };
        ws.onerror = (_error) => {
          if (WS_DEBUG) {
            // Debug logging would go here if enabled
          }
          connectingRef.current = false;
          connectionManager.lock = false;
        };
        // Ensure ping heartbeat exists
        if (!pingIntervalRef.current) {
          pingIntervalRef.current = setInterval(() => {
            try {
              if (
                wsRef.current &&
                wsRef.current.readyState === WebSocket.OPEN
              ) {
                wsRef.current.send(JSON.stringify({ type: "ping" }));
              }
            } catch {
              // Ping send failed - connection may be closed
            }
          }, PING_INTERVAL_MS);
        }
      } catch {
        // Handler rebinding failed - connection may be incomplete
      }
      // If already open, mark connected; if connecting, let onopen flip the flag
      if (connectionManager.instance.readyState === WebSocket.OPEN) {
        setState((prev: WebSocketDataState) => ({
          ...prev,
          isConnected: true,
        }));
      }
      return;
    }

    // Prevent multiple simultaneous connection attempts (React StrictMode protection)
    if (connectionManager.lock) {
      return;
    }

    // Prevent multiple connections
    if (
      wsRef.current?.readyState === WebSocket.CONNECTING ||
      wsRef.current?.readyState === WebSocket.OPEN ||
      connectingRef.current
    ) {
      if (WS_DEBUG) {
        // Debug logging would go here if enabled
      }
      return;
    }

    // Set global lock to prevent duplicate connections
    connectionManager.lock = true;

    connectingRef.current = true;
    try {
      const wsUrl = resolveWebSocketUrl();
      if (WS_DEBUG) {
        // Debug logging would go here if enabled
      }
      const ws = new WebSocket(wsUrl);
      // Set the global instance immediately so others reuse this while CONNECTING
      connectionManager.instance = ws;

      ws.onopen = () => {
        setState((prev: WebSocketDataState) => ({
          ...prev,
          isConnected: true,
        }));
        reconnectAttemptsRef.current = 0;
        connectingRef.current = false;
        connectionManager.lock = false; // Clear lock on successful connection
        connectionManager.instance = ws; // Set global instance
        connectionManager.connectTs = Date.now(); // Record connection time
        try {
          setWindowProperty("__wsConnection", wsRef);
        } catch {
          // Window property set failed - continue with connection
        }

        // Start heartbeat ping to keep proxies from closing idle connections
        try {
          if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
          }
          pingIntervalRef.current = setInterval(() => {
            try {
              if (
                wsRef.current &&
                wsRef.current.readyState === WebSocket.OPEN
              ) {
                wsRef.current.send(JSON.stringify({ type: "ping" }));
              }
            } catch {
              // Ping send failed - connection may be closed
            }
          }, PING_INTERVAL_MS);
        } catch {
          // Ping interval setup failed - heartbeat may not work
        }

        // Send filters if configured, then request data snapshot
        if (filters) {
          ws.send(
            JSON.stringify({
              type: "set_filter",
              filters,
            })
          );
        }
        // Always request snapshot on connect to ensure vacations load from DB
        try {
          ws.send(JSON.stringify({ type: "get_snapshot" }));
        } catch {
          // Snapshot request failed - connection may still succeed
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          processWebSocketMessage(message, {
            setState,
            getMessageQueueRef: () => messageQueueRef,
          });
        } catch {
          // Message processing failed - skip this message
        }
      };

      ws.onclose = (event: CloseEvent) => {
        setState((prev: WebSocketDataState) => ({
          ...prev,
          isConnected: false,
        }));
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        // Only nullify if this is the same instance
        if (wsRef.current === ws) {
          wsRef.current = null;
        }
        // Clear global state if this was the global instance
        if (connectionManager.instance === ws) {
          if (WS_DEBUG) {
            // Debug logging would go here if enabled
          }
          connectionManager.instance = null;
        }
        connectionManager.lock = false; // Always clear lock on close
        try {
          setWindowProperty("__wsConnection", null);
        } catch {
          // Window property clear failed - continue cleanup
        }
        connectingRef.current = false;

        // Attempt reconnection if enabled and not a normal close
        if (
          autoReconnect &&
          event.code !== WS_CLOSE_NORMAL &&
          reconnectAttemptsRef.current < maxReconnectAttempts
        ) {
          reconnectAttemptsRef.current += 1;
          const delay = calculateReconnectionDelay(
            reconnectInterval,
            reconnectAttemptsRef.current
          );
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          reconnectTimeoutRef.current = setTimeout(() => {
            this.connect();
          }, delay);
        }
      };

      ws.onerror = (_error) => {
        if (WS_DEBUG) {
          // Debug logging would go here if enabled
        }
        connectingRef.current = false;
        connectionManager.lock = false; // Clear lock on error
      };

      wsRef.current = ws;
    } catch (_error) {
      if (WS_DEBUG) {
        // Debug logging would go here if enabled
      }
      connectingRef.current = false;
      connectionManager.lock = false; // Clear lock on exception
    }
  }
}
