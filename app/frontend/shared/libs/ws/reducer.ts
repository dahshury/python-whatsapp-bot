import type { VacationSnapshot, WebSocketDataState, WebSocketMessage } from "@shared/libs/ws/types";
import type { ConversationMessage } from "@/entities/conversation";
import type { Reservation } from "@/entities/event";

export function reduceOnMessage(prev: WebSocketDataState, message: WebSocketMessage): WebSocketDataState {
	const { type, data, timestamp } = message;
	const next: WebSocketDataState = {
		...prev,
	};

	switch (type) {
		case "customer_document_updated": {
			// Fan-out a browser event; UI will handle applying scene to editors/viewers
			try {
				const d = (data || {}) as {
					wa_id?: string;
					waId?: string;
					document?: Record<string, unknown>;
				};
				const wa = String(d.wa_id || d.waId || "");
				if (wa) {
					setTimeout(() => {
						try {
							const evt = new CustomEvent("documents:external-update", {
								detail: { wa_id: wa, document: d.document },
							});
							window.dispatchEvent(evt);
						} catch {}
					}, 0);
				}
			} catch {}
			next.lastUpdate = timestamp;
			return next;
		}
		case "notifications_history": {
			// Pass filtered notifications history to UI (exclude tool calls, typing, acks)
			try {
				const raw = (data as unknown as { items?: unknown[] })?.items as Array<{
					id?: number | string;
					type?: string;
					timestamp?: string | number;
					data?: Record<string, unknown>;
				}> | null;
				if (Array.isArray(raw)) {
					const filtered = raw.filter((r) => {
						try {
							const t = String(r?.type || "").toLowerCase();
							if (!t) return false;
							if (t === "snapshot") return false;
							if (t.endsWith("_ack") || t.endsWith("_nack")) return false;
							if (t === "ack" || t === "nack") return false;
							if (t === "conversation_typing") return false;
							if (t === "customer_document_updated") return false;
							if (t === "conversation_new_message") {
								const role = String((r?.data as { role?: string } | undefined)?.role || "").toLowerCase();
								// Only show notifications for user/customer messages
								if (role !== "user" && role !== "customer") return false;
							}
							return true;
						} catch {
							return true;
						}
					});
					setTimeout(() => {
						try {
							const evt = new CustomEvent("notifications:history", {
								detail: { items: filtered },
							});
							window.dispatchEvent(evt);
						} catch {}
					}, 0);
				}
			} catch {}
			next.lastUpdate = timestamp;
			return next;
		}

		case "conversation_typing": {
			try {
				const d = (data || {}) as { wa_id?: string; state?: string };
				const wa = String(d?.wa_id || "");
				const on = String(d?.state || "").toLowerCase() !== "stop";
				if (wa) {
					setTimeout(() => {
						try {
							const evt = new CustomEvent("chat:typing", {
								detail: { wa_id: wa, typing: on },
							});
							window.dispatchEvent(evt);
						} catch {}
					}, 0);
				}
			} catch {}
			// No state mutation required, UI listens to chat:typing
			return next;
		}
		case "reservation_created":
		case "reservation_updated":
		case "reservation_reinstated": {
			const d = data as { wa_id?: string; waId?: string; id?: string | number };
			const waIdKey: string | undefined = d.wa_id || d.waId;
			if (waIdKey) {
				const byCustomer = Array.isArray(next.reservations[waIdKey]) ? [...next.reservations[waIdKey]] : [];
				const index = byCustomer.findIndex((r: Reservation) => String(r.id) === String(d.id));
				const reservation = data as unknown as Reservation;
				if (index >= 0) byCustomer[index] = reservation;
				else byCustomer.push(reservation);
				next.reservations = {
					...next.reservations,
					[waIdKey]: byCustomer,
				};
			}
			next.lastUpdate = timestamp;
			return next;
		}

		case "reservation_cancelled": {
			const d = data as { wa_id?: string; waId?: string; id?: string | number };
			const waIdKey: string | undefined = d.wa_id || d.waId;
			if (waIdKey && next.reservations[waIdKey]) {
				next.reservations = {
					...next.reservations,
					[waIdKey]: (next.reservations[waIdKey] || []).map((r: Reservation) =>
						String(r.id) === String(d.id)
							? ({
									...r,
									cancelled: true,
									...(data as unknown as Reservation),
								} as Reservation)
							: r
					),
				};
			} else {
				const updated: Record<string, Reservation[]> = {
					...next.reservations,
				};
				Object.keys(updated).forEach((k) => {
					const list = updated[k] || [];
					let changed = false;
					const mapped = list.map((r: Reservation) => {
						if (String(r.id) === String(d.id)) {
							changed = true;
							return {
								...r,
								cancelled: true,
								...(data as unknown as Reservation),
							} as Reservation;
						}
						return r;
					});
					if (changed) updated[k] = mapped;
				});
				next.reservations = updated;
			}
			next.lastUpdate = timestamp;
			return next;
		}

		case "conversation_new_message": {
			const d = data as { wa_id?: string };
			const waId = d.wa_id;
			if (waId) {
				const customerConversations = Array.isArray(next.conversations[waId]) ? [...next.conversations[waId]] : [];
				customerConversations.push(data as unknown as ConversationMessage);
				next.conversations = {
					...next.conversations,
					[waId]: customerConversations,
				};
			}
			next.lastUpdate = timestamp;
			return next;
		}

		case "vacation_period_updated": {
			const maybe = data as { periods?: VacationSnapshot[] } | VacationSnapshot[];
			next.vacations = Array.isArray(maybe) ? (maybe as VacationSnapshot[]) : maybe.periods || [];
			next.lastUpdate = timestamp;
			return next;
		}

		case "metrics_updated": {
			// No state change here; global metrics are handled by caller
			// Do not bump lastUpdate to avoid unnecessary calendar refreshes
			return next;
		}

		case "snapshot": {
			const d = data as {
				reservations?: Record<string, Reservation[]>;
				conversations?: Record<string, ConversationMessage[]>;
				vacations?: VacationSnapshot[];
			};
			next.reservations = d.reservations || {};
			next.conversations = d.conversations || {};
			next.vacations = d.vacations || [];
			next.lastUpdate = timestamp;
			return next;
		}

		case "customer_updated": {
			// Fan-out a customer profile update event for consumers (documents grid, etc.)
			try {
				const d = (data || {}) as {
					wa_id?: string;
					waId?: string;
					customer_name?: string | null;
					name?: string | null;
					age?: number | null;
				};
				const wa = String(d.wa_id || d.waId || "");
				if (wa) {
					setTimeout(() => {
						try {
							const evt = new CustomEvent("customers:profile", {
								detail: {
									wa_id: wa,
									name: (d.name ?? d.customer_name) || null,
									age: d.age ?? null,
								},
							});
							window.dispatchEvent(evt);
						} catch {}
					}, 0);
				}
			} catch {}
			next.lastUpdate = timestamp;
			return next;
		}

		default: {
			return next;
		}
	}
}
