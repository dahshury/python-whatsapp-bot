import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadCachedState, persistState } from "@/lib/ws/cache";
import { reduceOnMessage } from "@/lib/ws/reducer";
import type {
	UpdateType,
	WebSocketDataState,
	WebSocketMessage,
} from "@/lib/ws/types";
import { resolveWebSocketUrl } from "@/lib/ws/url";

// Extend globalThis to include custom properties
declare global {
	interface Window {
		__prom_metrics__?: Record<string, unknown>;
		__wsConnection?: unknown;
	}
}

// Helper function to set window properties safely
function setWindowProperty<T>(property: string, value: T): void {
	if (typeof window !== "undefined") {
		(window as unknown as Record<string, unknown>)[property] = value;
	}
}

// (Types moved to '@/lib/ws/types')

interface UseWebSocketDataOptions {
	autoReconnect?: boolean;
	maxReconnectAttempts?: number;
	reconnectInterval?: number;
	enableNotifications?: boolean;
	filters?: {
		updateTypes?: UpdateType[];
		entityIds?: string[];
	};
}

export function useWebSocketData(options: UseWebSocketDataOptions = {}) {
	const {
		autoReconnect = true,
		maxReconnectAttempts = Number.POSITIVE_INFINITY,
		reconnectInterval = 500, // Faster reconnection for quicker data load
		enableNotifications: _enableNotifications = true,
		filters,
	} = options;

	// Cache TTL (keep last good snapshot to avoid UI flicker on refresh)
	const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

	const [state, setState] = useState<WebSocketDataState>(() =>
		loadCachedState(CACHE_TTL_MS),
	);

	const wsRef = useRef<WebSocket | null>(null);
	const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const reconnectAttemptsRef = useRef(0);
	const messageQueueRef = useRef<WebSocketMessage[]>([]);
	const connectingRef = useRef(false); // Prevent multiple connection attempts
	const isConnectedRef = useRef(false);
	const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		isConnectedRef.current = state.isConnected;
	}, [state.isConnected]);

	// Get WebSocket URL from environment or default to local
	const getWebSocketUrl = useCallback(() => resolveWebSocketUrl(), []);

	// Process incoming WebSocket messages
	const processMessage = useCallback((message: WebSocketMessage) => {
		const { type, data } = message;

		setState((prev) => reduceOnMessage(prev, message));

		// Metrics and realtime event fan-out
		try {
			const payload = data as { metrics?: Record<string, unknown> };
			if (type === "metrics_updated" || type === "snapshot") {
				setWindowProperty("__prom_metrics__", payload.metrics || {});
			}
		} catch {}
		try {
			setTimeout(() => {
				try {
					// Pass the entire message to preserve all fields (error, timestamp, etc.)
					const evt = new CustomEvent("realtime", { detail: message });
					window.dispatchEvent(evt);
				} catch {}
			}, 0);
		} catch {}

		// Do not call notifyUpdate here to avoid duplicate toasts; handled via RealtimeEventBus -> ToastRouter
	}, []);

	// Connect to WebSocket - now stable function with auto-reconnect
	const connect = useCallback(() => {
		// Prevent multiple connections
		if (
			wsRef.current?.readyState === WebSocket.CONNECTING ||
			wsRef.current?.readyState === WebSocket.OPEN ||
			connectingRef.current
		) {
			return;
		}

		connectingRef.current = true;
		try {
			const wsUrl = getWebSocketUrl();
			const ws = new WebSocket(wsUrl);

			ws.onopen = () => {
				setState((prev) => ({ ...prev, isConnected: true }));
				reconnectAttemptsRef.current = 0;
				connectingRef.current = false;
				try {
					setWindowProperty("__wsConnection", wsRef);
				} catch {}

				// Start heartbeat ping to keep proxies from closing idle connections
				try {
					if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
					pingIntervalRef.current = setInterval(() => {
						try {
							if (
								wsRef.current &&
								wsRef.current.readyState === WebSocket.OPEN
							) {
								wsRef.current.send(JSON.stringify({ type: "ping" }));
							}
						} catch {}
					}, 25000);
				} catch {}

				// Send filters if configured, then request data snapshot
				if (filters) {
					ws.send(
						JSON.stringify({
							type: "set_filter",
							filters,
						}),
					);
				}
				// Always request snapshot on connect to ensure vacations load from DB
				try {
					ws.send(JSON.stringify({ type: "get_snapshot" }));
				} catch {}
			};

			ws.onmessage = (event) => {
				try {
					const message: WebSocketMessage = JSON.parse(event.data);
					processMessage(message);
					if (message.type === "snapshot") {
						// Clear any queued messages on full snapshot
						messageQueueRef.current = [];
					}
				} catch (error) {
					console.warn("Error parsing WebSocket message:", error);
				}
			};

			ws.onclose = (event) => {
				setState((prev) => ({ ...prev, isConnected: false }));
				if (pingIntervalRef.current) {
					clearInterval(pingIntervalRef.current);
					pingIntervalRef.current = null;
				}
				// Only nullify if this is the same instance
				if (wsRef.current === ws) wsRef.current = null;
				try {
					setWindowProperty("__wsConnection", null);
				} catch {}
				connectingRef.current = false;

				// Attempt reconnection if enabled and not a normal close
				if (
					autoReconnect &&
					event.code !== 1000 &&
					reconnectAttemptsRef.current < maxReconnectAttempts
				) {
					reconnectAttemptsRef.current++;
					const base =
						reconnectInterval * Math.max(1, reconnectAttemptsRef.current);
					const delay = Math.min(base, 15000) + Math.floor(Math.random() * 300); // cap 15s + jitter
					if (reconnectTimeoutRef.current)
						clearTimeout(reconnectTimeoutRef.current);
					reconnectTimeoutRef.current = setTimeout(() => {
						connect();
					}, delay);
				}
			};

			ws.onerror = (_error) => {
				console.warn("WebSocket manual connection error");
				connectingRef.current = false;
			};

			wsRef.current = ws;
		} catch (error) {
			console.warn("Failed to create manual WebSocket connection:", error);
			connectingRef.current = false;
		}
	}, [
		getWebSocketUrl,
		filters,
		processMessage,
		autoReconnect,
		reconnectInterval,
		maxReconnectAttempts,
	]);

	// Disconnect WebSocket
	const disconnect = useCallback(() => {
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current);
			reconnectTimeoutRef.current = null;
		}

		if (wsRef.current) {
			try {
				(wsRef.current as WebSocket).onclose = null;
			} catch {}
			try {
				(wsRef.current as WebSocket).onerror = null;
			} catch {}
			try {
				(wsRef.current as WebSocket).onopen = null;
			} catch {}
			try {
				(wsRef.current as WebSocket).onmessage = null;
			} catch {}
			if (pingIntervalRef.current) {
				clearInterval(pingIntervalRef.current);
				pingIntervalRef.current = null;
			}
			// Normal close; prevent auto-reconnect handler from scheduling
			wsRef.current.close(1000, "Manual disconnect");
			wsRef.current = null;
		}

		setState((prev) => ({ ...prev, isConnected: false }));
	}, []);

	// Manual refresh now re-requests a snapshot via WebSocket only (no REST fallback)
	const refreshData = useCallback(async () => {
		try {
			if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
				wsRef.current.send(JSON.stringify({ type: "get_snapshot" }));
			} else {
				// Try to reconnect and then request snapshot
				connect();
				setTimeout(() => {
					try {
						wsRef.current?.send(JSON.stringify({ type: "get_snapshot" }));
					} catch {}
				}, 500);
			}
		} catch {}
	}, [connect]);

	// Send vacation update to backend via WebSocket only
	const sendVacationUpdate = useCallback(
		async (payload: {
			periods: Array<{
				start: string | Date;
				end: string | Date;
				title?: string;
			}>;
		}) => {
			try {
				const buildDateOnly = (d: string | Date): string => {
					const date = typeof d === "string" ? new Date(d) : d;
					const y = date.getFullYear();
					const m = String(date.getMonth() + 1).padStart(2, "0");
					const day = String(date.getDate()).padStart(2, "0");
					return `${y}-${m}-${day}`;
				};

				const msg = {
					type: "vacation_update" as const,
					data: {
						periods: (payload.periods || [])
							.filter((p) => p?.start && p.end)
							.map((p) => ({
								start: buildDateOnly(p.start),
								end: buildDateOnly(p.end),
								title: p.title,
							})),
					},
				};

				// Mark this as a local operation so echoed notifications are suppressed
				try {
					(globalThis as { __localOps?: Set<string> }).__localOps =
						(globalThis as { __localOps?: Set<string> }).__localOps ||
						new Set<string>();
					const s = (globalThis as { __localOps?: Set<string> }).__localOps as
						Set<string>;
					// For vacation updates, echoed event type is 'vacation_period_updated' with no id/date/time
					// NotificationsButton builds composite key as `${type}::::` when fields are missing
					const localKey = "vacation_period_updated:::";
					s.add(localKey);
					setTimeout(() => {
						try {
							s.delete(localKey);
						} catch {}
					}, 5000);
				} catch {}

				const send = () => {
					try {
						wsRef.current?.send(JSON.stringify(msg));
					} catch (e) {
						console.error("Failed to send vacation update:", e);
					}
				};

				if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
					connect();
					setTimeout(send, 300);
				} else {
					send();
				}
			} catch {}
		},
		[connect],
	);

	// Initialize WebSocket connection immediately (no artificial delay)
	useEffect(() => {
		connect();

		// Request snapshot aggressively for faster load
		const requestSnapshot = () => {
			if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
				wsRef.current.send(JSON.stringify({ type: "get_snapshot" }));
			}
		};

		// Multiple snapshot requests to ensure fast data load
		setTimeout(requestSnapshot, 50);
		setTimeout(requestSnapshot, 200);
		setTimeout(requestSnapshot, 500);

		const handleOnline = () => {
			if (!isConnectedRef.current) connect();
		};
		const handleVisibility = () => {
			try {
				if (document.visibilityState === "visible" && !isConnectedRef.current) {
					connect();
				}
			} catch {}
		};
		window.addEventListener("online", handleOnline);
		document.addEventListener("visibilitychange", handleVisibility);

		return () => {
			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current);
				reconnectTimeoutRef.current = null;
			}
			window.removeEventListener("online", handleOnline);
			document.removeEventListener("visibilitychange", handleVisibility);
			disconnect();
		};
	}, [connect, disconnect]); // Keep stable to avoid reconnect/disconnect loop on state changes

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current);
			}
		};
	}, []);

	// Persist snapshot to sessionStorage to avoid blank UI on refresh
	useEffect(() => {
		try {
			persistState(state);
		} catch {}
	}, [
		state.reservations,
		state.conversations,
		state.vacations,
		state.lastUpdate,
		state,
	]);

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
		],
	);
}
