import { isAllowedNotificationEvent } from "@shared/libs/notifications/utils";
import type {
	VacationSnapshot,
	WebSocketDataState,
	WebSocketMessage,
} from "@shared/libs/ws/types";
import { zConversationMessage } from "@shared/validation/domain/conversation.schema";
import { zReservation } from "@shared/validation/domain/reservation.schema";
import { z } from "zod";
import type { ConversationMessage } from "@/entities/conversation";
import type { Reservation } from "@/entities/event";

function handleCustomerSearchResults(data: Record<string, unknown>): void {
	// Fan-out a browser event so components can consume async search results
	try {
		const d = (data || {}) as {
			q?: string;
			items?: Array<{ wa_id?: string; name?: string | null }>;
		};
		setTimeout(() => {
			try {
				const evt = new CustomEvent("customers:search", { detail: d });
				window.dispatchEvent(evt);
			} catch {
				// Dispatch failed; silently ignore
			}
		}, 0);
	} catch {
		// Event creation failed; silently ignore
	}
}

function handleCustomerDocumentUpdated(data: Record<string, unknown>): void {
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
				} catch {
					// Dispatch failed; silently ignore
				}
			}, 0);
		}
	} catch {
		// Event creation failed; silently ignore
	}
}

function handleNotificationsHistory(data: Record<string, unknown>): void {
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
					return isAllowedNotificationEvent(
						r?.type as string,
						r?.data as Record<string, unknown>
					);
				} catch {
					return false;
				}
			});
			setTimeout(() => {
				try {
					const evt = new CustomEvent("notifications:history", {
						detail: { items: filtered },
					});
					window.dispatchEvent(evt);
				} catch {
					// Dispatch failed; silently ignore
				}
			}, 0);
		}
	} catch {
		// Event creation failed; silently ignore
	}
}

function handleConversationTyping(data: Record<string, unknown>): void {
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
				} catch {
					// Dispatch failed; silently ignore
				}
			}, 0);
		}
	} catch {
		// Event creation failed; silently ignore
	}
}

function handleReservationMutation(
	prev: WebSocketDataState,
	data: Record<string, unknown>
): WebSocketDataState {
	const next = { ...prev };
	const d = data as { wa_id?: string; waId?: string; id?: string | number };
	const waIdKey: string | undefined = d.wa_id || d.waId;

	// biome-ignore lint/suspicious/noConsole: DEBUG
	globalThis.console?.log?.(
		`[WS] handleReservationMutation: waId=${waIdKey} id=${d.id} | Full data:`,
		JSON.parse(JSON.stringify(data))
	);

	if (waIdKey) {
		const byCustomer = Array.isArray(next.reservations[waIdKey])
			? [...next.reservations[waIdKey]]
			: [];
		const index = byCustomer.findIndex(
			(r: Reservation) => String(r.id) === String(d.id)
		);
		// Data validated earlier at WS boundary. Keep a narrow fallback parse.
		const maybe = zReservation.safeParse(data);
		const reservation = (
			maybe.success ? maybe.data : (data as unknown)
		) as Reservation;
		if (index >= 0) {
			byCustomer[index] = reservation;
		} else {
			byCustomer.push(reservation);
		}
		next.reservations = {
			...next.reservations,
			[waIdKey]: byCustomer,
		};
	}
	return next;
}

function handleReservationCancelled(
	prev: WebSocketDataState,
	data: Record<string, unknown>
): WebSocketDataState {
	const next = { ...prev };
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
		for (const k of Object.keys(updated)) {
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
			if (changed) {
				updated[k] = mapped;
			}
		}
		next.reservations = updated;
	}
	return next;
}

function handleConversationNewMessage(
	prev: WebSocketDataState,
	data: Record<string, unknown>
): WebSocketDataState {
	const next = { ...prev };
	const d = data as { wa_id?: string };
	const waId = d.wa_id;
	if (waId) {
		const customerConversations = Array.isArray(next.conversations[waId])
			? [...next.conversations[waId]]
			: [];
		const maybe = zConversationMessage.safeParse(data);
		const msg = (
			maybe.success ? maybe.data : (data as unknown)
		) as ConversationMessage;
		customerConversations.push(msg);
		next.conversations = {
			...next.conversations,
			[waId]: customerConversations,
		};
	}
	return next;
}

function handleVacationPeriodUpdated(
	prev: WebSocketDataState,
	data: Record<string, unknown>
): WebSocketDataState {
	const next = { ...prev };
	const zVacationData = z.union([
		z.array(
			z
				.object({ start: z.string().optional(), end: z.string().optional() })
				.passthrough()
		),
		z.object({
			periods: z.array(
				z
					.object({ start: z.string().optional(), end: z.string().optional() })
					.passthrough()
			),
		}),
	]);
	const parsed = zVacationData.safeParse(data);
	if (parsed.success) {
		if (Array.isArray(parsed.data)) {
			next.vacations = parsed.data as unknown as VacationSnapshot[];
		} else {
			next.vacations = (parsed.data.periods ||
				[]) as unknown as VacationSnapshot[];
		}
	}
	return next;
}

function handleCustomerUpdated(data: Record<string, unknown>): void {
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
				} catch {
					// Dispatch failed; silently ignore
				}
			}, 0);
		}
	} catch {
		// Event creation failed; silently ignore
	}
}

function handleSnapshot(
	prev: WebSocketDataState,
	data: Record<string, unknown>
): WebSocketDataState {
	const next = { ...prev };
	const zSnapshotPayload = z.object({
		reservations: z.record(z.array(zReservation)).optional(),
		conversations: z.record(z.array(zConversationMessage)).optional(),
		vacations: z
			.array(
				z
					.object({ start: z.string().optional(), end: z.string().optional() })
					.passthrough()
			)
			.optional(),
	});
	const parsed = zSnapshotPayload.safeParse(data);
	if (parsed.success) {
		const d = parsed.data;
		next.reservations = (d.reservations || {}) as unknown as Record<
			string,
			Reservation[]
		>;
		next.conversations = (d.conversations || {}) as unknown as Record<
			string,
			ConversationMessage[]
		>;
		next.vacations = (d.vacations || []) as unknown as VacationSnapshot[];
	}
	return next;
}

export function reduceOnMessage(
	prev: WebSocketDataState,
	message: WebSocketMessage
): WebSocketDataState {
	const { type, data, timestamp } = message;

	switch (type) {
		case "customer_search_results" as unknown as never: {
			handleCustomerSearchResults(data);
			return prev;
		}
		case "customer_document_updated" as unknown as never: {
			handleCustomerDocumentUpdated(data);
			return prev;
		}
		case "notifications_history" as unknown as never: {
			handleNotificationsHistory(data);
			return prev;
		}

		case "conversation_typing": {
			handleConversationTyping(data);
			// No state mutation required, UI listens to chat:typing
			return prev;
		}
		case "reservation_created":
		case "reservation_updated":
		case "reservation_reinstated": {
			const next = handleReservationMutation(prev, data);
			next.lastUpdate = timestamp;
			return next;
		}

		case "reservation_cancelled": {
			const next = handleReservationCancelled(prev, data);
			next.lastUpdate = timestamp;
			return next;
		}

		case "conversation_new_message": {
			const next = handleConversationNewMessage(prev, data);
			next.lastUpdate = timestamp;
			return next;
		}

		case "vacation_period_updated": {
			const next = handleVacationPeriodUpdated(prev, data);
			next.lastUpdate = timestamp;
			return next;
		}

		case "metrics_updated": {
			// No state change here; global metrics are handled by caller
			// Return the previous reference to avoid triggering re-renders
			return prev;
		}

		case "snapshot": {
			const next = handleSnapshot(prev, data);
			next.lastUpdate = timestamp;
			return next;
		}

		case "customer_updated": {
			handleCustomerUpdated(data);
			const next = { ...prev };
			next.lastUpdate = timestamp;
			return next;
		}

		default: {
			// Unknown message type: do not change state
			return prev;
		}
	}
}
