import { useWsStore } from "@shared/libs/store/ws-store";
// Dev logger (safe in production due to internal gating)
import { devInfo, devLog, devWarn } from "@shared/libs/utils/dev-logger";
import { zWebSocketMessage } from "@shared/validation/ws/message.schema";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Vacation } from "@/entities/vacation";
import { loadCachedState, persistState } from "@/shared/libs/ws/cache";
import { reduceOnMessage } from "@/shared/libs/ws/reducer";
import type {
	UpdateType,
	VacationSnapshot,
	WebSocketDataState,
	WebSocketMessage,
} from "@/shared/libs/ws/types";
import { resolveWebSocketUrl } from "@/shared/libs/ws/url";

// Toggle verbose WebSocket error logging via env flag (default: off)
const WS_DEBUG = process.env.NEXT_PUBLIC_WS_DEBUG === "true";

// Constants
const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const CACHE_TTL_MS =
	MILLISECONDS_PER_SECOND * SECONDS_PER_MINUTE * MINUTES_PER_HOUR; // 1 hour
const HEARTBEAT_INTERVAL_MS = 25_000; // 25 seconds
const LOCK_RETRY_DELAY_MS = 150; // 150ms
const MAX_RECONNECT_DELAY_MS = 15_000; // 15 seconds
const RECONNECT_JITTER_MS = 300; // Random jitter up to 300ms
const SNAPSHOT_REQUEST_DELAY_FAST_MS = 50; // First snapshot request
const SNAPSHOT_REQUEST_DELAY_MID_MS = 200; // Second snapshot request
const SNAPSHOT_REQUEST_DELAY_SLOW_MS = 500; // Third snapshot request
const NORMAL_CLOSE_CODE = 1000;
const LOCAL_OPS_TIMEOUT_MS = 5000; // 5 seconds
const DISCONNECT_PENDING_MS = 500; // 500ms
const SNAPSHOT_RECONNECT_DELAY_MS = 300; // Delay before sending snapshot after reconnect

// Helper function to set window properties safely
function setWindowProperty<T>(property: string, value: T): void {
	if (typeof window !== "undefined") {
		(window as unknown as Record<string, unknown>)[property] = value;
	}
}

// (Types moved to '@shared/libs/ws/types')

type UseWebSocketDataOptions = {
	autoReconnect?: boolean;
	maxReconnectAttempts?: number;
	reconnectInterval?: number;
	enableNotifications?: boolean;
	filters?: {
		updateTypes?: UpdateType[];
		entityIds?: string[];
	};
};

// Global/shared state to coordinate a single WS connection across subscribers and bundles
// Store on globalThis to avoid duplicate sockets when modules are bundled separately (StrictMode/HMR/routes)
const __g =
	(globalThis as unknown as {
		__wsLock?: boolean;
		__wsInstance?: WebSocket | null;
		__wsConnectTs?: number;
		__wsSubs?: number;
		__wsPendingDisconnect?: ReturnType<typeof setTimeout> | null;
	}) || {};

if (typeof globalThis !== "undefined") {
	if (typeof __g.__wsLock !== "boolean") {
		__g.__wsLock = false;
	}
	if (typeof __g.__wsInstance === "undefined") {
		__g.__wsInstance = null;
	}
	if (typeof __g.__wsConnectTs !== "number") {
		__g.__wsConnectTs = 0;
	}
	if (typeof __g.__wsSubs !== "number") {
		__g.__wsSubs = 0;
	}
}

let nextInstanceId = 1;

type SocketCloseHandlerOptions = {
	event: CloseEvent;
	wsRef: React.MutableRefObject<WebSocket | null>;
	pingIntervalRef: React.MutableRefObject<NodeJS.Timeout | null>;
	reconnectTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
	connectingRef: React.MutableRefObject<boolean>;
	autoReconnect: boolean;
	reconnectInterval: number;
	maxReconnectAttempts: number;
	reconnectAttemptsRef: React.MutableRefObject<number>;
	connect: () => void;
	setState: (fn: (prev: WebSocketDataState) => WebSocketDataState) => void;
};

function handleSocketClose(opts: SocketCloseHandlerOptions): void {
	const {
		event,
		wsRef,
		pingIntervalRef,
		reconnectTimeoutRef,
		connectingRef,
		autoReconnect,
		reconnectInterval,
		maxReconnectAttempts,
		reconnectAttemptsRef,
		connect,
		setState,
	} = opts;

	setState((prev) => ({ ...prev, isConnected: false }));
	if (pingIntervalRef.current) {
		clearInterval(pingIntervalRef.current);
		pingIntervalRef.current = null;
	}
	if (wsRef.current === (event.target as WebSocket)) {
		wsRef.current = null;
	}
	if (__g.__wsInstance === (event.target as WebSocket)) {
		__g.__wsInstance = null;
	}
	__g.__wsLock = false;
	try {
		setWindowProperty("__wsConnection", null);
	} catch {
		// Window property clear failed; silently ignore
	}
	connectingRef.current = false;
	if (
		autoReconnect &&
		event.code !== NORMAL_CLOSE_CODE &&
		reconnectAttemptsRef.current < maxReconnectAttempts
	) {
		reconnectAttemptsRef.current++;
		const base = reconnectInterval * Math.max(1, reconnectAttemptsRef.current);
		const delay =
			Math.min(base, MAX_RECONNECT_DELAY_MS) +
			Math.floor(Math.random() * RECONNECT_JITTER_MS);
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current);
		}
		reconnectTimeoutRef.current = setTimeout(() => connect(), delay);
	}
}

function setupHeartbeat(
	wsRef: React.MutableRefObject<WebSocket | null>,
	pingIntervalRef: React.MutableRefObject<NodeJS.Timeout | null>
): void {
	if (!pingIntervalRef.current) {
		pingIntervalRef.current = setInterval(() => {
			try {
				if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
					wsRef.current.send(JSON.stringify({ type: "ping" }));
				}
			} catch {
				// Heartbeat send failed; will retry on next interval
			}
		}, HEARTBEAT_INTERVAL_MS);
	}
}

type SocketEventHandlerOptions = {
	socket: WebSocket;
	onSocketOpen: (webSocket: WebSocket) => void;
	processMessage: (message: WebSocketMessage) => void;
	messageQueueRef: React.MutableRefObject<WebSocketMessage[]>;
	connectingRef: React.MutableRefObject<boolean>;
	handleCloseEvent: (event: CloseEvent) => void;
};

function setupSocketEventHandlers(opts: SocketEventHandlerOptions): void {
	const {
		socket,
		onSocketOpen,
		processMessage,
		messageQueueRef,
		connectingRef,
		handleCloseEvent,
	} = opts;

	socket.onopen = () => onSocketOpen(socket);
	socket.onmessage = (event) => {
		try {
			const raw = JSON.parse(event.data);
			const parsed = zWebSocketMessage.safeParse(raw);
			if (!parsed.success) {
				return; // Invalid message; ignore
			}
			const message = parsed.data as unknown as WebSocketMessage;
			processMessage(message);
			if (message.type === "snapshot") {
				messageQueueRef.current = [];
			}
		} catch {
			// Message parse failed; silently ignore
		}
	};
	socket.onclose = (event) => {
		handleCloseEvent(event as CloseEvent);
	};
	socket.onerror = () => {
		// Suppress noisy socket error logs; handled via reconnect flow
		connectingRef.current = false;
		__g.__wsLock = false;
	};
}

function clearSocketEventHandlers(socket: WebSocket): void {
	try {
		socket.onclose = null;
	} catch {
		// Event handler clear failed; silently ignore
	}
	try {
		socket.onerror = null;
	} catch {
		// Event handler clear failed; silently ignore
	}
	try {
		socket.onopen = null;
	} catch {
		// Event handler clear failed; silently ignore
	}
	try {
		socket.onmessage = null;
	} catch {
		// Event handler clear failed; silently ignore
	}
}

function isExistingInstanceUsable(): boolean {
	return (
		__g.__wsInstance !== null &&
		[WebSocket.OPEN, WebSocket.CONNECTING].includes(
			(__g.__wsInstance as WebSocket).readyState as 0 | 1
		)
	);
}

function isAlreadyConnecting(
	wsRef: React.MutableRefObject<WebSocket | null>,
	connectingRef: React.MutableRefObject<boolean>
): boolean {
	return (
		wsRef.current?.readyState === WebSocket.CONNECTING ||
		wsRef.current?.readyState === WebSocket.OPEN ||
		connectingRef.current
	);
}

// Helper function to transform VacationSnapshot to Vacation with generated IDs
function transformVacationSnapshots(snapshots: VacationSnapshot[]): Vacation[] {
	return snapshots.map((snapshot, index) => ({
		id: `${snapshot.start}-${snapshot.end}-${index}`,
		start: snapshot.start,
		end: snapshot.end,
	}));
}

export function useWebSocketData(options: UseWebSocketDataOptions = {}) {
	const {
		autoReconnect = true,
		maxReconnectAttempts = Number.POSITIVE_INFINITY,
		reconnectInterval = 500, // Faster reconnection for quicker data load
		enableNotifications: _enableNotifications = true,
		filters,
	} = options;

	// Stable per-mount instance id for debugging (only log in dev mode with WS_DEBUG=true)
	const instanceIdRef = useRef<number>(0);
	if (instanceIdRef.current === 0) {
		instanceIdRef.current = nextInstanceId++;
		if (WS_DEBUG) {
			// Debug: instance created
		}
	}

	const [state, setState] = useState<WebSocketDataState>(() =>
		loadCachedState(CACHE_TTL_MS)
	);

	const wsRef = useRef<WebSocket | null>(null);
	const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const reconnectAttemptsRef = useRef(0);
	const messageQueueRef = useRef<WebSocketMessage[]>([]);
	const connectingRef = useRef(false); // Prevent multiple connection attempts
	const isConnectedRef = useRef(false);
	const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const lockRetryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		isConnectedRef.current = state.isConnected;
	}, [state.isConnected]);

	// Get WebSocket URL from environment or default to local
	const getWebSocketUrl = useCallback(() => resolveWebSocketUrl(), []);

	// Process incoming WebSocket messages
	const processMessage = useCallback((message: WebSocketMessage) => {
		const { type, data } = message;

		// Minimal inline logging to avoid increasing complexity
		if (process.env.NODE_ENV !== "production") {
			try {
				devLog("WS message", {
					type,
					keys: Object.keys((data || {}) as Record<string, unknown>),
				});
			} catch {
				// ignore
			}
		}

		setState((prev) => {
			const next = reduceOnMessage(prev, message);
			try {
				const store = useWsStore.getState();
				if (next.conversations !== prev.conversations) {
					store.setConversations(next.conversations);
				}
				if (next.reservations !== prev.reservations) {
					store.setReservations(next.reservations);
				}
				if (next.vacations !== prev.vacations) {
					store.setVacations(transformVacationSnapshots(next.vacations));
				}
			} catch {
				// Store sync failed; ignore
			}
			return next;
		});

		// Metrics and realtime event fan-out
		try {
			const payload = data as { metrics?: Record<string, unknown> };
			// Only handle metrics from explicit metrics updates; snapshots omit metrics on calendar
			if (type === "metrics_updated") {
				setWindowProperty("__prom_metrics__", payload.metrics || {});
			}
		} catch {
			// Metrics update failed; silently ignore
		}
		setTimeout(() => {
			try {
				// Pass the entire message to preserve all fields (error, timestamp, etc.)
				const evt = new CustomEvent("realtime", { detail: message });
				window.dispatchEvent(evt);
			} catch {
				// Event dispatch failed; silently ignore
			}
		}, 0);

		// Do not call notifyUpdate here to avoid duplicate toasts; handled via RealtimeEventBus -> ToastRouter
	}, []);

	// Connect to WebSocket - split into inner function to keep wrapper simple
	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: WS connection requires multiple branches
	const connect = useCallback(() => {
		const scheduleLockRetry = () => {
			if (lockRetryTimeoutRef.current) {
				return;
			}
			lockRetryTimeoutRef.current = setTimeout(() => {
				lockRetryTimeoutRef.current = null;
				// Recurse via current closure to avoid rebuilding deps
				connect();
			}, LOCK_RETRY_DELAY_MS);
		};

		const clearLockRetry = () => {
			if (lockRetryTimeoutRef.current) {
				clearTimeout(lockRetryTimeoutRef.current);
				lockRetryTimeoutRef.current = null;
			}
		};

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: event wiring
		const onSocketOpen = (ws: WebSocket) => {
			setState((prev) => ({ ...prev, isConnected: true }));
			reconnectAttemptsRef.current = 0;
			connectingRef.current = false;
			__g.__wsLock = false;
			__g.__wsInstance = ws;
			__g.__wsConnectTs = Date.now();
			clearLockRetry();
			if (process.env.NODE_ENV !== "production") {
				try {
					devInfo("WS open", { url: ws.url });
				} catch {
					// ignore
				}
			}
			try {
				setWindowProperty("__wsConnection", wsRef);
			} catch {
				// ignore
			}
			setupHeartbeat(wsRef, pingIntervalRef);
			if (filters) {
				try {
					ws.send(JSON.stringify({ type: "set_filter", filters }));
				} catch {
					// Filter send failed; silently ignore
				}
			}
			try {
				ws.send(JSON.stringify({ type: "get_snapshot" }));
			} catch {
				// Snapshot request failed; silently ignore
			}
		};

		// First check if there's already a working or connecting global instance
		if (isExistingInstanceUsable()) {
			const ws = __g.__wsInstance as WebSocket;
			wsRef.current = ws;
			try {
				setWindowProperty("__wsConnection", wsRef);
			} catch {
				// Window property set failed; silently ignore
			}
			try {
				setupSocketEventHandlers({
					socket: ws,
					onSocketOpen,
					processMessage,
					messageQueueRef,
					connectingRef,
					handleCloseEvent: (event) => {
						handleSocketClose({
							event,
							wsRef,
							pingIntervalRef,
							reconnectTimeoutRef,
							connectingRef,
							autoReconnect,
							reconnectInterval,
							maxReconnectAttempts,
							reconnectAttemptsRef,
							connect,
							setState,
						});
					},
				});
				setupHeartbeat(wsRef, pingIntervalRef);
			} catch {
				// Socket event handler setup failed; silently ignore
			}
			if ((__g.__wsInstance as WebSocket).readyState === WebSocket.OPEN) {
				onSocketOpen(ws);
			}
			return;
		}

		// Prevent multiple simultaneous connection attempts (React StrictMode protection)
		if (__g.__wsLock) {
			scheduleLockRetry();
			return;
		}

		// Prevent multiple connections
		if (isAlreadyConnecting(wsRef, connectingRef)) {
			scheduleLockRetry();
			return;
		}

		// Set global lock to prevent duplicate connections
		__g.__wsLock = true;

		connectingRef.current = true;
		try {
			const wsUrl = getWebSocketUrl();
			if (process.env.NODE_ENV !== "production") {
				try {
					devInfo("WS connecting", { url: wsUrl });
				} catch {
					// ignore
				}
			}
			const ws = new WebSocket(wsUrl);
			__g.__wsInstance = ws;
			const onClose = (event: CloseEvent) =>
				handleSocketClose({
					event,
					wsRef,
					pingIntervalRef,
					reconnectTimeoutRef,
					connectingRef,
					autoReconnect,
					reconnectInterval,
					maxReconnectAttempts,
					reconnectAttemptsRef,
					connect,
					setState,
				});
			setupSocketEventHandlers({
				socket: ws,
				onSocketOpen,
				processMessage,
				messageQueueRef,
				connectingRef,
				handleCloseEvent: onClose,
			});
			setupHeartbeat(wsRef, pingIntervalRef);
			wsRef.current = ws;
		} catch (err) {
			// Connection creation failed; will retry after delay
			connectingRef.current = false;
			__g.__wsLock = false;
			scheduleLockRetry();
			try {
				devWarn("WS connect error", err as unknown);
			} catch {
				// ignore
			}
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
			clearSocketEventHandlers(wsRef.current);
			if (pingIntervalRef.current) {
				clearInterval(pingIntervalRef.current);
				pingIntervalRef.current = null;
			}
			// Normal close; prevent auto-reconnect handler from scheduling
			wsRef.current.close(NORMAL_CLOSE_CODE, "Manual disconnect");
			// Clear global instance if this was it
			if (__g.__wsInstance === wsRef.current) {
				__g.__wsInstance = null;
			}
			wsRef.current = null;
		}

		// Clear global lock and state
		__g.__wsLock = false;
		setState((prev) => ({ ...prev, isConnected: false }));
	}, []);

	// Manual refresh now re-requests a snapshot via WebSocket only (no REST fallback)
	const refreshData = useCallback(() => {
		try {
			if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
				wsRef.current.send(JSON.stringify({ type: "get_snapshot" }));
			} else {
				// Try to reconnect and then request snapshot
				connect();
				setTimeout(() => {
					try {
						wsRef.current?.send(JSON.stringify({ type: "get_snapshot" }));
					} catch {
						// Snapshot send failed; silently ignore
					}
				}, SNAPSHOT_RECONNECT_DELAY_MS);
			}
		} catch {
			// Refresh failed; silently ignore
		}
	}, [connect]);

	// Send vacation update to backend via WebSocket only
	const sendVacationUpdate = useCallback(
		(payload: {
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
						} catch {
							// Local ops cleanup failed; silently ignore
						}
					}, LOCAL_OPS_TIMEOUT_MS);
				} catch {
					// Local ops setup failed; silently ignore
				}

				const send = () => {
					try {
						wsRef.current?.send(JSON.stringify(msg));
					} catch {
						// Message send failed; silently ignore
					}
				};

				if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
					connect();
					setTimeout(send, SNAPSHOT_RECONNECT_DELAY_MS);
				} else {
					send();
				}
			} catch {
				// Vacation update failed; silently ignore
			}
		},
		[connect]
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
		for (const delay of [
			SNAPSHOT_REQUEST_DELAY_FAST_MS,
			SNAPSHOT_REQUEST_DELAY_MID_MS,
			SNAPSHOT_REQUEST_DELAY_SLOW_MS,
		]) {
			setTimeout(requestSnapshot, delay);
		}

		const handleOnline = () => {
			if (!isConnectedRef.current) {
				connect();
			}
		};
		const handleVisibility = () => {
			try {
				if (document.visibilityState === "visible" && !isConnectedRef.current) {
					connect();
				}
			} catch {
				// Visibility check failed; silently ignore
			}
		};
		window.addEventListener("online", handleOnline);
		document.addEventListener("visibilitychange", handleVisibility);

		return () => {
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
						disconnect();
					}
					__g.__wsPendingDisconnect = null;
				}, DISCONNECT_PENDING_MS);
			}
		};
	}, [connect, disconnect]); // Keep stable to avoid reconnect/disconnect loop on state changes

	// Cleanup on unmount
	useEffect(
		() => () => {
			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current);
			}
		},
		[]
	);

	// Persist snapshot to sessionStorage to avoid blank UI on refresh
	useEffect(() => {
		try {
			persistState(state);
		} catch {
			// Persist failed; silently ignore
		}
	}, [
		state.reservations,
		state.conversations,
		state.vacations,
		state.lastUpdate,
		state,
	]);

	// Sync Zustand store on state changes (covers initial cache load)
	useEffect(() => {
		try {
			const store = useWsStore.getState();
			store.setReservations(state.reservations);
			store.setConversations(state.conversations);
			store.setVacations(transformVacationSnapshots(state.vacations));
		} catch {
			// ignore
		}
	}, [state.reservations, state.conversations, state.vacations]);

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
		]
	);
}
