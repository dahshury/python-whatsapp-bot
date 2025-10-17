"use client";

import { i18n } from "@shared/libs/i18n";
import type {
	NotificationItem,
	ReservationData,
} from "@shared/libs/notifications/types";
import { isAllowedNotificationEvent } from "@shared/libs/notifications/utils";
import React from "react";

// Constants
const MAX_NOTIFICATIONS = 2000;
const EMPTY_LIMIT = 0;

type Params = {
	setItems: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
	isLocalized: boolean;
	resolveCustomerName: (
		waId?: string,
		fallbackName?: string
	) => string | undefined;
};

function buildNotificationText(
	type: string | undefined,
	data: ReservationData,
	isLocalized: boolean,
	resolveCustomerName: (
		waId?: string,
		fallbackName?: string
	) => string | undefined
): string {
	if (type === "reservation_created") {
		return `${i18n.getMessage("toast_reservation_created", isLocalized)}: ${
			resolveCustomerName(data.wa_id, data.customer_name) || data.wa_id
		} ${data.date ?? ""} ${data.time_slot ?? ""}`;
	}
	if (type === "reservation_updated" || type === "reservation_reinstated") {
		return `${i18n.getMessage("toast_reservation_modified", isLocalized)}: ${
			resolveCustomerName(data.wa_id, data.customer_name) || data.wa_id
		} ${data.date ?? ""} ${data.time_slot ?? ""}`;
	}
	if (type === "reservation_cancelled") {
		return `${i18n.getMessage("toast_reservation_cancelled", isLocalized)}: ${data.wa_id}`;
	}
	if (type === "conversation_new_message") {
		return `${i18n.getMessage("new_message", isLocalized)}: ${
			resolveCustomerName(data.wa_id, data.customer_name) || data.wa_id
		}`;
	}
	if (type === "vacation_period_updated") {
		return i18n.getMessage("toast_vacation_periods_updated", isLocalized);
	}
	return String(type);
}

function isNotificationAllowed(notification: NotificationItem): boolean {
	return isAllowedNotificationEvent(
		notification.type,
		notification.data as Record<string, unknown>
	);
}

function shouldFilterOutNotification(notification: NotificationItem): boolean {
	// Filter out notifications that match recent local operations
	try {
		const localOps = (globalThis as { __localOps?: Set<string> }).__localOps;
		if (!localOps || localOps.size === EMPTY_LIMIT) {
			return false;
		}

		const d = notification.data;
		const candidates = [
			`${notification.type}:${d?.id ?? ""}:${d?.date ?? ""}:${d?.time_slot ?? ""}`,
			`${notification.type}:${d?.wa_id ?? ""}:${d?.date ?? ""}:${d?.time_slot ?? ""}`,
		];

		for (const candidate of candidates) {
			if (localOps.has(candidate)) {
				return true;
			}
		}
		return false;
	} catch {
		// If error checking local operations, don't filter out
		return false;
	}
}

export function useNotificationsHistory({
	setItems,
	isLocalized,
	resolveCustomerName,
}: Params) {
	React.useEffect(() => {
		let isCancelled = false;
		const fromWs = (ev: Event) => {
			try {
				const detail = (ev as CustomEvent).detail as
					| {
							items?: Array<{
								id?: number | string;
								type?: string;
								timestamp?: string | number;
								data?: Record<string, unknown>;
							}>;
					  }
					| undefined;
				const list = (
					detail && Array.isArray(detail.items) ? detail.items : []
				) as Array<{
					id?: number | string;
					type?: string;
					timestamp?: string | number;
					data?: Record<string, unknown>;
				}>;
				const loaded: NotificationItem[] = list
					.map((r) => {
						const tsNum = (() => {
							const t = r.timestamp as string | number | undefined;
							if (typeof t === "number") {
								return t;
							}
							const tsIso = String(t || "");
							return Number(new Date(tsIso).getTime() || Date.now());
						})();
						const d = (r.data || {}) as ReservationData;
						const compositeKey = `${r.type}:${d?.id ?? d?.wa_id ?? ""}:${d?.date ?? ""}:${d?.time_slot ?? ""}`;
						return {
							id: `${tsNum}:${compositeKey}`,
							text: buildNotificationText(
								r.type,
								d,
								isLocalized,
								resolveCustomerName
							),
							timestamp: tsNum,
							unread: false,
							type: String(r.type || ""),
							data: d,
						};
					})
					.filter(isNotificationAllowed)
					.filter((notification) => !shouldFilterOutNotification(notification));
				loaded.sort((a, b) => b.timestamp - a.timestamp);
				if (!isCancelled) {
					setItems(loaded.slice(0, MAX_NOTIFICATIONS));
				}
			} catch {
				// Ignore errors when processing notifications history
			}
		};
		window.addEventListener("notifications:history", fromWs as EventListener);
		// Send one WS request for notifications history (guard to prevent duplicates)
		try {
			(
				window as unknown as { __notif_history_requested__?: boolean }
			).__notif_history_requested__ = true;
			const already = (
				window as unknown as {
					__notif_history_requested__?: boolean;
				}
			).__notif_history_requested__;
			if (!already) {
				const wsRef = (
					globalThis as {
						__wsConnection?: { current?: WebSocket };
					}
				).__wsConnection;
				if (wsRef?.current?.readyState === WebSocket.OPEN) {
					wsRef.current.send(
						JSON.stringify({
							type: "get_notifications",
							data: { limit: MAX_NOTIFICATIONS },
						})
					);
				}
				(
					window as unknown as { __notif_history_requested__?: boolean }
				).__notif_history_requested__ = true;
			}
		} catch {
			// Ignore errors when requesting notifications history
		}
		return () => {
			isCancelled = true;
			window.removeEventListener(
				"notifications:history",
				fromWs as EventListener
			);
		};
	}, [isLocalized, resolveCustomerName, setItems]);
}
