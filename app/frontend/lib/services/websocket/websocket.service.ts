import { modifyReservation } from "@/lib/api";
import type { ApiResponse, WebSocketMessage } from "../types/data-table-types";

export class WebSocketService {
	/**
	 * Send a message via WebSocket with HTTP fallback
	 */
	async sendMessage(message: WebSocketMessage): Promise<boolean> {
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

	/**
	 * Wait for WebSocket confirmation (ack/nack)
	 */
	private waitForWSConfirmation(args: {
		reservationId?: string | number;
		waId?: string | number;
		date: string;
		time: string;
		timeoutMs?: number;
	}): Promise<{ success: boolean; message?: string }> {
		const { reservationId, waId, date, timeoutMs = 10000 } = args;

		return new Promise((resolve) => {
			let resolved = false;

			const handler = (ev: Event) => {
				try {
					const detail = (ev as CustomEvent).detail as
						| { type?: string; data?: any; error?: string }
						| undefined;
					const t = detail?.type;
					const d = detail?.data || {};

					// Listen for direct WebSocket ack/nack responses
					if (t === "modify_reservation_ack") {
						if (!resolved) {
							resolved = true;
							window.removeEventListener("realtime", handler as EventListener);
							resolve({ success: true, message: d.message });
						}
					} else if (t === "modify_reservation_nack") {
						if (!resolved) {
							resolved = true;
							window.removeEventListener("realtime", handler as EventListener);
							const errorMessage =
								detail?.error || d.message || "Operation failed";
							resolve({ success: false, message: errorMessage });
						}
					}
					// Fallback: listen for reservation_updated broadcasts
					else if (
						(t === "reservation_updated" || t === "reservation_reinstated") &&
						((reservationId != null &&
							String(d.id) === String(reservationId)) ||
							(waId != null &&
								String(d.wa_id ?? d.waId) === String(waId) &&
								String(d.date) === String(date)))
					) {
						if (!resolved) {
							resolved = true;
							window.removeEventListener("realtime", handler as EventListener);
							resolve({ success: true });
						}
					}
				} catch {}
			};

			// Set up timeout
			const timeoutId = setTimeout(() => {
				if (!resolved) {
					resolved = true;
					try {
						window.removeEventListener("realtime", handler as EventListener);
					} catch {}
					resolve({ success: false, message: "Request timeout" });
				}
			}, timeoutMs);

			try {
				window.addEventListener("realtime", handler as EventListener);

				// Clean up timeout when resolved
				const originalResolve = resolve;
				resolve = (result) => {
					clearTimeout(timeoutId);
					originalResolve(result);
				};
			} catch {
				clearTimeout(timeoutId);
				resolve({
					success: false,
					message: "Failed to set up confirmation listener",
				});
			}
		});
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
	): Promise<ApiResponse> {
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
			},
		});

		if (wsSuccess) {
			// Wait for backend confirmation
			const confirmation = await this.waitForWSConfirmation({
				reservationId: updates.reservationId,
				waId,
				date: updates.date,
				time: updates.time,
			});

			return {
				success: confirmation.success,
				message: confirmation.message,
			};
		}

		// Fallback to HTTP API
		return (await modifyReservation(waId, updates)) as ApiResponse;
	}
}
