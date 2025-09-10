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

// Global/shared state to coordinate a single WS connection across subscribers and bundles
// Store on globalThis to avoid duplicate sockets when modules are bundled separately (StrictMode/HMR/routes)
const __g = (globalThis as unknown as {
	__wsLock?: boolean;
	__wsInstance?: WebSocket | null;
	__wsConnectTs?: number;
	__wsSubs?: number;
	__wsPendingDisconnect?: ReturnType<typeof setTimeout> | null;
}) || {};

if (typeof globalThis !== "undefined") {
	if (typeof __g.__wsLock !== "boolean") __g.__wsLock = false;
	if (typeof __g.__wsInstance === "undefined") __g.__wsInstance = null;
	if (typeof __g.__wsConnectTs !== "number") __g.__wsConnectTs = 0;
	if (typeof __g.__wsSubs !== "number") __g.__wsSubs = 0;
}

let nextInstanceId = 1;

export function useWebSocketData(options: UseWebSocketDataOptions = {}) {
	const {
		autoReconnect = true,
		maxReconnectAttempts = Number.POSITIVE_INFINITY,
		reconnectInterval = 500, // Faster reconnection for quicker data load
		enableNotifications: _enableNotifications = true,
		filters,
	} = options;

	// Stable per-mount instance id for debugging
	const instanceIdRef = useRef<number>(0);
	if (instanceIdRef.current === 0) instanceIdRef.current = nextInstanceId++;
	console.log(
		"🔧 [DEBUG] useWebSocketData hook called, instance:",
		instanceIdRef.current,
		"subscribers:",
		(__g.__wsSubs as number),
		"global lock:",
		Boolean(__g.__wsLock),
		"global instance:",
		Boolean(__g.__wsInstance),
	);

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
		console.log("🔧 [DEBUG] connect() called, checking global lock and instance");
		
		// First check if there's already a working or connecting global instance
		if (
			__g.__wsInstance &&
			[WebSocket.OPEN, WebSocket.CONNECTING].includes((__g.__wsInstance as WebSocket).readyState as 0 | 1)
		) {
			console.log(
				"🔧 [DEBUG] Reusing existing global WebSocket instance (state:",
				(__g.__wsInstance as WebSocket).readyState,
				")",
			);
			const ws = __g.__wsInstance as WebSocket;
			wsRef.current = ws;
			// Rebind handlers to this hook instance to avoid stale closures after StrictMode remounts
			try {
				ws.onmessage = (event) => {
					try {
						const message: WebSocketMessage = JSON.parse(event.data);
						processMessage(message);
						if (message.type === "snapshot") {
							messageQueueRef.current = [];
						}
					} catch (error) {
						console.warn("Error parsing WebSocket message:", error);
					}
				};
				ws.onclose = (event) => {
					console.log("🔧 [DEBUG] WebSocket onclose event:", event.code, event.reason);
					setState((prev) => ({ ...prev, isConnected: false }));
					if (pingIntervalRef.current) {
						clearInterval(pingIntervalRef.current);
						pingIntervalRef.current = null;
					}
					if (wsRef.current === ws) wsRef.current = null;
					if (__g.__wsInstance === ws) {
						console.log("🔧 [DEBUG] Clearing global WebSocket instance");
						__g.__wsInstance = null;
					}
					__g.__wsLock = false;
					try {
						setWindowProperty("__wsConnection", null);
					} catch {}
					connectingRef.current = false;

					if (
						autoReconnect &&
						event.code !== 1000 &&
						reconnectAttemptsRef.current < maxReconnectAttempts
					) {
						reconnectAttemptsRef.current++;
						const base = reconnectInterval * Math.max(1, reconnectAttemptsRef.current);
						const delay = Math.min(base, 15000) + Math.floor(Math.random() * 300);
						if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
						reconnectTimeoutRef.current = setTimeout(() => {
							connect();
						}, delay);
					}
				};
				ws.onerror = (error) => {
					console.error("🔧 [DEBUG] WebSocket error:", error);
					connectingRef.current = false;
					__g.__wsLock = false;
				};
				// Ensure ping heartbeat exists
				if (!pingIntervalRef.current) {
					pingIntervalRef.current = setInterval(() => {
						try {
							if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
								wsRef.current.send(JSON.stringify({ type: "ping" }));
							}
						} catch {}
					}, 25000);
				}
			} catch {}
			// If already open, mark connected; if connecting, let onopen flip the flag
			if ((__g.__wsInstance as WebSocket).readyState === WebSocket.OPEN) {
				setState((prev) => ({ ...prev, isConnected: true }));
			}
			return;
		}
		
		// Prevent multiple simultaneous connection attempts (React StrictMode protection)
		if (__g.__wsLock) {
			console.log("🔧 [DEBUG] Global connection lock active, skipping duplicate connection attempt");
			return;
		}
		
		// Prevent multiple connections
		if (
			wsRef.current?.readyState === WebSocket.CONNECTING ||
			wsRef.current?.readyState === WebSocket.OPEN ||
			connectingRef.current
		) {
			console.log("🔧 [DEBUG] Already connecting/connected, skipping");
			return;
		}

		// Set global lock to prevent duplicate connections
		__g.__wsLock = true;

		connectingRef.current = true;
		try {
			const wsUrl = getWebSocketUrl();
			console.log("🔧 [DEBUG] Creating new WebSocket with URL:", wsUrl);
			const ws = new WebSocket(wsUrl);
			// Set the global instance immediately so others reuse this while CONNECTING
			__g.__wsInstance = ws;

			ws.onopen = () => {
				console.log(`🔧 [DEBUG] Instance ${instanceIdRef.current}: WebSocket connected successfully, clearing global lock`);
				setState((prev) => ({ ...prev, isConnected: true }));
				reconnectAttemptsRef.current = 0;
				connectingRef.current = false;
				__g.__wsLock = false; // Clear lock on successful connection
				__g.__wsInstance = ws; // Set global instance
				__g.__wsConnectTs = Date.now(); // Record connection time
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
				console.log("🔧 [DEBUG] WebSocket onclose event:", event.code, event.reason);
				setState((prev) => ({ ...prev, isConnected: false }));
				if (pingIntervalRef.current) {
					clearInterval(pingIntervalRef.current);
					pingIntervalRef.current = null;
				}
				// Only nullify if this is the same instance
				if (wsRef.current === ws) wsRef.current = null;
				// Clear global state if this was the global instance
				if (__g.__wsInstance === ws) {
					console.log("🔧 [DEBUG] Clearing global WebSocket instance");
					__g.__wsInstance = null;
				}
				__g.__wsLock = false; // Always clear lock on close
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

			ws.onerror = (error) => {
				console.error("🔧 [DEBUG] WebSocket error:", error);
				connectingRef.current = false;
				__g.__wsLock = false; // Clear lock on error
			};

			wsRef.current = ws;
		} catch (error) {
			console.error("🔧 [DEBUG] Failed to create WebSocket connection:", error);
			connectingRef.current = false;
			__g.__wsLock = false; // Clear lock on exception
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
		const timeSinceConnection = Date.now() - ((__g.__wsConnectTs as number) || 0);
		console.log(`🔧 [DEBUG] Instance ${instanceIdRef.current}: disconnect() called, subscribers: ${String(__g.__wsSubs)}, time since connection: ${timeSinceConnection}ms`);
		
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
			// Clear global instance if this was it
			if (__g.__wsInstance === wsRef.current) {
				console.log("🔧 [DEBUG] Clearing global WebSocket instance on disconnect");
				__g.__wsInstance = null;
			}
			wsRef.current = null;
		}

		// Clear global lock and state
		__g.__wsLock = false;
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
					const s = (globalThis as { __localOps?: Set<string> })
						.__localOps as Set<string>;
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
		// Track subscribers and ensure a single shared connection
		__g.__wsSubs = ((__g.__wsSubs as number) || 0) + 1;
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
			console.log(`🔧 [DEBUG] Instance ${instanceIdRef.current}: useEffect cleanup, subscribers before cleanup: ${String(__g.__wsSubs)}`);
			__g.__wsSubs = Math.max(0, Number(__g.__wsSubs || 0) - 1);
			
			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current);
				reconnectTimeoutRef.current = null;
			}
			window.removeEventListener("online", handleOnline);
			document.removeEventListener("visibilitychange", handleVisibility);
			
			// Only disconnect if no more subscribers remain. Delay slightly to avoid StrictMode double-unmount glitches
			if (__g.__wsPendingDisconnect) {
				clearTimeout(__g.__wsPendingDisconnect);
				__g.__wsPendingDisconnect = null;
			}
			if (!__g.__wsSubs) {
				__g.__wsPendingDisconnect = setTimeout(() => {
					if (!__g.__wsSubs) {
						console.log(`🔧 [DEBUG] Instance ${instanceIdRef.current}: No subscribers remain after delay, calling disconnect`);
						disconnect();
					}
					__g.__wsPendingDisconnect = null;
				}, 500);
			} else {
				console.log(`🔧 [DEBUG] Instance ${instanceIdRef.current}: Subscribers remain (${String(__g.__wsSubs)}), skipping disconnect`);
			}
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
