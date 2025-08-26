import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toastService } from "@/lib/toast-service";

// WebSocket message types from backend
type UpdateType =
	| "reservation_created"
	| "reservation_updated"
	| "reservation_cancelled"
	| "reservation_reinstated"
	| "conversation_new_message"
	| "vacation_period_updated"
	| "vacation_update_ack"
	| "vacation_update_nack"
	| "customer_updated"
	| "metrics_updated"
	| "snapshot";

interface WebSocketMessage {
	type: UpdateType;
	timestamp: string;
	data: Record<string, any>;
	affected_entities?: string[];
}

interface WebSocketDataState {
	reservations: Record<string, any[]>;
	conversations: Record<string, any[]>;
	vacations: any[];
	isConnected: boolean;
	lastUpdate: string | null;
}

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
		enableNotifications = true,
		filters,
	} = options;

	// Cache keys and TTL (keep last good snapshot to avoid UI flicker on refresh)
	const STORAGE_KEY = "ws_snapshot_v1";
	const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

	const loadCachedState = (): WebSocketDataState => {
		try {
			const raw =
				typeof window !== "undefined"
					? sessionStorage.getItem(STORAGE_KEY)
					: null;
			if (raw) {
				const parsed = JSON.parse(raw);
				const ts: number = parsed?.__ts || 0;
				if (Date.now() - ts < CACHE_TTL_MS) {
					return {
						reservations: parsed?.reservations || {},
						conversations: parsed?.conversations || {},
						vacations: parsed?.vacations || [], // Re-enable vacation caching for faster load
						isConnected: false,
						lastUpdate: parsed?.lastUpdate || null,
					};
				}
			}
		} catch {}
		return {
			reservations: {},
			conversations: {},
			vacations: [],
			isConnected: false,
			lastUpdate: null,
		};
	};

	const [state, setState] = useState<WebSocketDataState>(loadCachedState);

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
	const getWebSocketUrl = useCallback(() => {
		// 1) Explicit public override
		const explicit = process.env.NEXT_PUBLIC_WEBSOCKET_URL;
		if (explicit) {
			console.log("WebSocket URL (explicit):", explicit);
			return explicit;
		}

		// 2) Map backend HTTP URL to WS
		const httpUrl =
			process.env.PYTHON_BACKEND_URL ||
			process.env.BACKEND_URL ||
			"http://localhost:8000";
		try {
			const url = new URL(httpUrl);
			url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
			url.pathname = "/ws";
			const mapped = url.toString();
			console.log("WebSocket URL (mapped):", mapped);
			return mapped;
		} catch {}

		// 3) Final fallback
		const fallback = "ws://localhost:8000/ws";
		console.log("WebSocket URL (fallback):", fallback);
		return fallback;
	}, []);

	// Process incoming WebSocket messages
	// Show user-friendly notifications for updates (via unified toast service)
	const showUpdateNotification = useCallback(
		(type: UpdateType, data: Record<string, unknown>): void => {
			switch (type) {
				case "reservation_created":
					toastService.reservationCreated({
						customer: (data as any).customer_name,
						wa_id: (data as any).wa_id,
						date: (data as any).date,
						time: ((data as any).time_slot || "").slice(0, 5),
					});
					break;
				case "reservation_cancelled":
					toastService.reservationCancelled({
						customer: (data as any).customer_name,
						wa_id: (data as any).wa_id,
						date: (data as any).date,
						time: ((data as any).time_slot || "").slice(0, 5),
					});
					break;
				case "reservation_updated":
				case "reservation_reinstated":
					// Skip generic updates, handled elsewhere if needed
					break;
				case "conversation_new_message":
					toastService.newMessage({
						title: `Message • ${(data as any).wa_id}`,
						description: String((data as any).message || "").slice(0, 100),
					});
					break;
				// Add more notification types as needed
			}
		},
		[], // toastService methods are stable
	);

	const processMessage = useCallback(
		(message: WebSocketMessage) => {
			const { type, data, timestamp } = message;

			setState((prevState) => {
				const newState = { ...prevState, lastUpdate: timestamp };

				switch (type) {
					case "reservation_created":
					case "reservation_updated":
					case "reservation_reinstated": {
						// Store reservations grouped by waId (customer), not by date
						const waIdKey: string | undefined = data.wa_id || data.waId;
						if (waIdKey) {
							const byCustomer = newState.reservations[waIdKey] || [];
							const idx = byCustomer.findIndex(
								(r: any) => String(r.id) === String(data.id),
							);
							if (idx >= 0) byCustomer[idx] = data;
							else byCustomer.push(data);
							newState.reservations = {
								...newState.reservations,
								[waIdKey]: byCustomer,
							};
							try {
								setTimeout(() => {
									try {
										const evt = new CustomEvent("realtime", {
											detail: { type, data },
										});
										window.dispatchEvent(evt);
									} catch {}
								}, 0);
							} catch {}
						}
						break;
					}

					case "reservation_cancelled": {
						// Mark reservation as cancelled within the customer's list; robust fallback if waId not provided
						const waIdKey: string | undefined = data.wa_id || data.waId;
						if (waIdKey && newState.reservations[waIdKey]) {
							newState.reservations = {
								...newState.reservations,
								[waIdKey]: newState.reservations[waIdKey].map((r: any) =>
									String(r.id) === String(data.id)
										? { ...r, cancelled: true, ...data }
										: r,
								),
							};
						} else {
							// Fallback: scan all lists to find the reservation id
							const updated: Record<string, any[]> = {
								...newState.reservations,
							};
							Object.keys(updated).forEach((k) => {
								const list = updated[k] || [];
								let changed = false;
								const next = list.map((r: any) => {
									if (String(r.id) === String(data.id)) {
										changed = true;
										return { ...r, cancelled: true, ...data };
									}
									return r;
								});
								if (changed) updated[k] = next;
							});
							newState.reservations = updated;
						}
						try {
							setTimeout(() => {
								try {
									const evt = new CustomEvent("realtime", {
										detail: { type, data },
									});
									window.dispatchEvent(evt);
								} catch {}
							}, 0);
						} catch {}
						break;
					}

					case "conversation_new_message": {
						// Add new conversation message
						const waId = data.wa_id;
						if (waId) {
							const customerConversations = newState.conversations[waId] || [];
							customerConversations.push(data);
							newState.conversations = {
								...newState.conversations,
								[waId]: customerConversations,
							};
							try {
								setTimeout(() => {
									try {
										const evt = new CustomEvent("realtime", {
											detail: { type, data },
										});
										window.dispatchEvent(evt);
									} catch {}
								}, 0);
							} catch {}
						}
						break;
					}

					case "vacation_period_updated":
						// Update vacation periods
						newState.vacations = data.periods || data;
						try {
							setTimeout(() => {
								try {
									const evt = new CustomEvent("realtime", {
										detail: { type, data },
									});
									window.dispatchEvent(evt);
								} catch {}
							}, 0);
						} catch {}
						break;

					case "metrics_updated":
						// Update global metrics for dashboard provider
						try {
							(globalThis as any).__prom_metrics__ = data.metrics || {};
						} catch {}
						try {
							setTimeout(() => {
								try {
									const evt = new CustomEvent("realtime", {
										detail: { type, data },
									});
									window.dispatchEvent(evt);
								} catch {}
							}, 0);
						} catch {}
						break;
					case "snapshot":
						// Initial snapshot of all data
						newState.reservations = data.reservations || {};
						newState.conversations = data.conversations || {};
						newState.vacations = data.vacations || [];
						try {
							(globalThis as any).__prom_metrics__ = data.metrics || {};
						} catch {}
						try {
							setTimeout(() => {
								try {
									const evt = new CustomEvent("realtime", {
										detail: { type, data },
									});
									window.dispatchEvent(evt);
								} catch {}
							}, 0);
						} catch {}
						break;

					case "customer_updated":
						// Handle customer updates - might need to refresh related data
						// This could trigger a broader refresh if needed
						break;

					default:
						console.warn("Unknown WebSocket message type:", type);
				}

				return newState;
			});

			// Show notification if enabled
			if (enableNotifications) {
				showUpdateNotification(type, data);
			}
		},
		[enableNotifications, showUpdateNotification],
	);

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
			console.log("Manually connecting to WebSocket:", wsUrl);
			const ws = new WebSocket(wsUrl);

			ws.onopen = () => {
				console.log("WebSocket manually connected");
				setState((prev) => ({ ...prev, isConnected: true }));
				reconnectAttemptsRef.current = 0;
				connectingRef.current = false;
				try {
					(globalThis as any).__wsConnection = wsRef;
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
				console.log(
					"WebSocket manually disconnected:",
					event.code,
					event.reason,
				);
				setState((prev) => ({ ...prev, isConnected: false }));
				if (pingIntervalRef.current) {
					clearInterval(pingIntervalRef.current);
					pingIntervalRef.current = null;
				}
				// Only nullify if this is the same instance
				if (wsRef.current === ws) wsRef.current = null;
				try {
					(globalThis as any).__wsConnection = null;
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
				console.warn("WebSocket manual connection error:", error);
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
				wsRef.current.onclose = null as any;
			} catch {}
			try {
				wsRef.current.onerror = null as any;
			} catch {}
			try {
				wsRef.current.onopen = null as any;
			} catch {}
			try {
				wsRef.current.onmessage = null as any;
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

				const msg: any = {
					type: "vacation_update",
					data: {} as Record<string, any>,
				};
				(msg.data as any).periods = (payload.periods || [])
					.filter((p) => p?.start && p.end)
					.map((p) => ({
						start: buildDateOnly(p.start),
						end: buildDateOnly(p.end),
						title: p.title,
					}));

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
		console.log(
			"Initializing WebSocket connection with cached snapshot hydration",
		);
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
			if (typeof window !== "undefined") {
				sessionStorage.setItem(
					STORAGE_KEY,
					JSON.stringify({
						reservations: state.reservations,
						conversations: state.conversations,
						// Re-enable vacation caching for instant load on refresh
						vacations: state.vacations,
						lastUpdate: state.lastUpdate,
						__ts: Date.now(),
					}),
				);
			}
		} catch {}
	}, [
		state.reservations,
		state.conversations,
		state.vacations,
		state.lastUpdate,
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
