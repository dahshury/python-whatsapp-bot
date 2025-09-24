import type {
	VacationSnapshot,
	WebSocketDataState,
	WebSocketMessage,
} from "@/lib/ws/types";
import type { ConversationMessage, Reservation } from "@/types/calendar";

export function reduceOnMessage(
	prev: WebSocketDataState,
	message: WebSocketMessage,
): WebSocketDataState {
	const { type, data, timestamp } = message;
	const next: WebSocketDataState = {
		...prev,
	};

	switch (type) {
    case "document_snapshot": {
        // Relay snapshot to interested listeners (documents scene hook)
        try {
            setTimeout(() => {
                try {
                    const evt = new CustomEvent("documents:sceneSnapshot", {
                        detail: data,
                    });
                    window.dispatchEvent(evt);
                } catch {}
            }, 0);
        } catch {}
        next.lastUpdate = timestamp;
        return next;
    }

    case "customer_profile": {
        // Relay customer profile to listeners (document customer row hook)
        try {
            setTimeout(() => {
                try {
                    const evt = new CustomEvent("documents:customerProfile", {
                        detail: data,
                    });
                    window.dispatchEvent(evt);
                } catch {}
            }, 0);
        } catch {}
        next.lastUpdate = timestamp;
        return next;
    }
    case "notifications_history": {
			// Pass-through: reducer doesn't store notifications, the panel manages its own state.
			// Fan-out as a browser event so listeners (notifications-button) can ingest.
			try {
				const list = (data as unknown as { items?: unknown[] })?.items as Array<{
					id?: number | string;
					type?: string;
					timestamp?: string | number;
					data?: Record<string, unknown>;
				}> | null;
				if (Array.isArray(list)) {
                setTimeout(() => {
                    try {
                        const evt = new CustomEvent("notifications:history", {
                            detail: { items: list },
                        });
                        window.dispatchEvent(evt);
                    } catch {}
                }, 0);
				}
			} catch {}
			next.lastUpdate = timestamp;
			return next;
		}
		case "reservation_created":
		case "reservation_updated":
		case "reservation_reinstated": {
			const d = data as { wa_id?: string; waId?: string; id?: string | number };
			const waIdKey: string | undefined = d.wa_id || d.waId;
			if (waIdKey) {
				const byCustomer = Array.isArray(next.reservations[waIdKey])
					? [...next.reservations[waIdKey]]
					: [];
				const index = byCustomer.findIndex(
					(r: Reservation) => String(r.id) === String(d.id),
				);
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
							: r,
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
				const customerConversations = Array.isArray(next.conversations[waId])
					? [...next.conversations[waId]]
					: [];
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
			const maybe = data as
				| { periods?: VacationSnapshot[] }
				| VacationSnapshot[];
			next.vacations = Array.isArray(maybe)
				? (maybe as VacationSnapshot[])
				: maybe.periods || [];
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
			// No-op for now
			return next;
		}

		default: {
			return next;
		}
	}
}
