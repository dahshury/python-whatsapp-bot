import {
	cancelReservation as httpCancelReservation,
	modifyReservation,
} from "@shared/libs/api";
import type { ApiResponse, WebSocketMessage } from "@/entities/event";

type CancelReservationMethod = {
	cancelReservation: (
		waId: string,
		date: string,
		opts?: { isLocalized?: boolean }
	) => Promise<ApiResponse>;
};

type WSConfirmationDetail = {
	type?: string;
	data?: Record<string, unknown>;
	error?: string;
};

type WSConfirmationResult = {
	success: boolean;
	message?: string;
};

class WebSocketService {
	/**
	 * Send a message via WebSocket with HTTP fallback
	 */
	sendMessage(message: WebSocketMessage): Promise<boolean> {
		return new Promise((resolve) => {
			try {
				const wsRef = (globalThis as GlobalThis).__wsConnection;
				if (wsRef?.current?.readyState === WebSocket.OPEN) {
					wsRef.current.send(JSON.stringify(message));
					resolve(true);
				} else {
					resolve(false);
				}
			} catch {
				resolve(false);
			}
		});
	}

	searchCustomers(query: string, limit = 25): Promise<boolean> {
		return this.sendMessage({
			type: "customer_search",
			data: { query, limit },
		});
	}

	/**
	 * Wait for WebSocket confirmation (ack/nack)
	 */
	private waitForWSConfirmation(args: {
		reservationId?: string | number;
		waId?: string | number;
		date: string;
		time: string;
		timeoutMs?: number;
	}): Promise<WSConfirmationResult> {
		const { reservationId, waId, date, timeoutMs = 10_000 } = args;

		return new Promise((resolve) => {
			let resolved = false;
			let timeoutId: NodeJS.Timeout;

			const handler = (ev: Event) => {
				this.handleWSConfirmationEvent({
					ev,
					reservationId,
					waId,
					date,
					resolved,
					onResolved: (newResolved: boolean, result: WSConfirmationResult) => {
						resolved = newResolved;
						if (newResolved) {
							clearTimeout(timeoutId);
							resolve(result);
						}
					},
				});
			};

			// Set up timeout
			timeoutId = setTimeout(() => {
				if (!resolved) {
					resolved = true;
					try {
						window.removeEventListener("realtime", handler as EventListener);
					} catch {
						// Silently ignore event listener removal errors
					}
					resolve({ success: false, message: "Request timeout" });
				}
			}, timeoutMs);

			try {
				window.addEventListener("realtime", handler as EventListener);
			} catch {
				clearTimeout(timeoutId);
				resolve({
					success: false,
					message: "Failed to set up confirmation listener",
				});
			}
		});
	}

	private handleWSConfirmationEvent(options: {
		ev: Event;
		reservationId: string | number | undefined;
		waId: string | number | undefined;
		date: string;
		resolved: boolean;
		onResolved: (isResolved: boolean, result: WSConfirmationResult) => void;
	}): void {
		try {
			const detail = (options.ev as CustomEvent).detail as
				| WSConfirmationDetail
				| undefined;
			const t = detail?.type;
			const d = detail?.data || {};

			// Listen for direct WebSocket ack/nack responses
			if (t === "modify_reservation_ack") {
				if (!options.resolved) {
					options.onResolved(true, {
						success: true,
						message: String(d.message || ""),
					});
				}
			} else if (t === "modify_reservation_nack") {
				if (!options.resolved) {
					const errorMessage = detail?.error || d.message || "Operation failed";
					options.onResolved(true, {
						success: false,
						message: String(errorMessage),
					});
				}
			} // Fallback: listen for reservation_updated broadcasts
			else if (this.shouldResolveFromBroadcast(t, d, options)) {
				options.onResolved(true, { success: true });
			}
		} catch {
			// Silently ignore event detail parsing errors
		}
	}

	private shouldResolveFromBroadcast(
		eventType: unknown,
		eventData: Record<string, unknown>,
		options: {
			reservationId: string | number | undefined;
			waId: string | number | undefined;
			date: string;
			resolved: boolean;
		}
	): boolean {
		if (
			eventType !== "reservation_updated" &&
			eventType !== "reservation_reinstated"
		) {
			return false;
		}
		if (options.resolved) {
			return false;
		}
		const idMatches =
			options.reservationId != null &&
			String(eventData.id) === String(options.reservationId);
		const waIdAndDateMatch =
			options.waId != null &&
			String(eventData.wa_id ?? eventData.waId) === String(options.waId) &&
			String(eventData.date) === String(options.date);
		return idMatches || waIdAndDateMatch;
	}

	/**
	 * Modify reservation via WebSocket with confirmation
	 */
	async modifyReservation(
		waId: string,
		updates: {
			date: string;
			time: string;
			title?: string;
			type?: number;
			reservationId?: number;
			approximate?: boolean;
		},
		opts?: { isLocalized?: boolean }
	): Promise<ApiResponse> {
		// biome-ignore lint/suspicious/noConsole: DEBUG
		globalThis.console?.log?.("[WebSocketService] modifyReservation()", {
			waId,
			updates,
			opts,
		});
		// Try WebSocket first
		const wsSuccess = await this.sendMessage({
			type: "modify_reservation",
			data: {
				wa_id: waId,
				date: updates.date,
				time_slot: updates.time,
				customer_name: updates.title,
				type: updates.type,
				reservation_id: updates.reservationId,
				approximate: updates.approximate,
				// pass localization preference through to backend for ack/nack messages
				ar: opts?.isLocalized,
			},
		});
		// biome-ignore lint/suspicious/noConsole: DEBUG
		globalThis.console?.log?.("[WebSocketService] sendMessage result", {
			wsSuccess,
		});

		if (wsSuccess) {
			// Wait for backend confirmation
			const confirmation = await this.waitForWSConfirmation({
				reservationId: updates.reservationId || "",
				waId,
				date: updates.date,
				time: updates.time,
			});
			// biome-ignore lint/suspicious/noConsole: DEBUG
			globalThis.console?.log?.(
				"[WebSocketService] WS confirmation received",
				confirmation
			);

			return {
				success: confirmation.success,
				...(confirmation.message && { message: confirmation.message }),
			};
		}

		// Fallback to HTTP API
		const httpResp = (await modifyReservation(
			waId,
			updates
		)) as unknown as ApiResponse;
		// biome-ignore lint/suspicious/noConsole: DEBUG
		globalThis.console?.log?.(
			"[WebSocketService] HTTP fallback modifyReservation()",
			httpResp
		);
		return httpResp;
	}
}

// Note: WebSocketService is extended via global interface in @/entities/event

(
	WebSocketService.prototype as unknown as CancelReservationMethod
).cancelReservation = async function (
	this: WebSocketService,
	waId: string,
	date: string,
	opts?: { isLocalized?: boolean }
): Promise<ApiResponse> {
	const wsSuccess = await this.sendMessage({
		type: "cancel_reservation",
		data: { wa_id: waId, date, ar: opts?.isLocalized },
	});
	if (wsSuccess) {
		return { success: true } as ApiResponse;
	}
	// Fallback to HTTP
	const payload: { id: string; date: string; isLocalized?: boolean } = {
		id: waId,
		date,
		...(typeof opts?.isLocalized === "boolean"
			? { isLocalized: opts.isLocalized }
			: {}),
	};
	return (await httpCancelReservation(payload)) as unknown as ApiResponse;
};

export { WebSocketService };
