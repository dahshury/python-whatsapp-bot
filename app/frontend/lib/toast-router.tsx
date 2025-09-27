"use client";

import * as React from "react";
import { i18n } from "@/lib/i18n";
import { useLanguage } from "@/lib/language-context";
import { notificationManager } from "@/lib/services/notifications/notification-manager.service";
import { toastService } from "@/lib/toast-service";
import { useReservationsData } from "@/lib/websocket-data-provider";

export const ToastRouter: React.FC = () => {
	const { isLocalized } = useLanguage();
	const { reservations } = useReservationsData();

	const resolveCustomerName = React.useCallback(
		(waId?: string, fallbackName?: string): string | undefined => {
			try {
				if (fallbackName && String(fallbackName).trim())
					return String(fallbackName);
				const id = String(waId || "");
				if (!id) return undefined;
				const list =
					(
						reservations as
							| Record<string, Array<{ customer_name?: string }>>
							| undefined
					)?.[id] || [];
				for (const r of list) {
					if (r?.customer_name) return String(r.customer_name);
				}
			} catch {}
			return undefined;
		},
		[reservations],
	);

	React.useEffect(() => {
		const handleAny = (ev: Event) => {
			try {
				const { type, data } = (ev as CustomEvent).detail || {};
				if (!type || !data) return;
				// Show toasts for both local and backend events; unread count is handled elsewhere

				// Always emit notifications from WebSocket events; frontend never emits toasts directly

				if (type === "reservation_created") {
					// Use centralized notification manager for WebSocket create echoes
					notificationManager.showReservationCreated({
						customer: data.customer_name,
						wa_id: data.wa_id,
						date: data.date,
						time: (data.time_slot || "").slice(0, 5),
						isLocalized,
					});
				} else if (
					type === "reservation_updated" ||
					type === "reservation_reinstated"
				) {
					// Use centralized notification manager for WebSocket echoes
					notificationManager.showReservationModified({
						customer: data.customer_name,
						wa_id: data.wa_id,
						date: data.date,
						time: (data.time_slot || "").slice(0, 5),
						isLocalized,
					});
				} else if (type === "reservation_cancelled") {
					// Use centralized notification manager for WebSocket cancellation echoes
					notificationManager.showReservationCancelled({
						customer: data.customer_name,
						wa_id: data.wa_id,
						date: data.date,
						time: (data.time_slot || "").slice(0, 5),
						isLocalized,
					});
                } else if (type === "conversation_new_message") {
					const messageLabel = i18n.getMessage(
						"toast_new_message",
						isLocalized,
					);
                    const waId = String((data as { wa_id?: string; waId?: string })?.wa_id || (data as { waId?: string }).waId || "");
					const name = resolveCustomerName(
						waId,
						(data as { customer_name?: string })?.customer_name,
					);
					const who = name || waId;
					const title = `${messageLabel} • ${who}`;
					const maybeDate = (data as { date?: string }).date;
					const maybeTime = (data as { time?: string }).time;
					const maybeMessage = (data as { message?: string }).message;
					toastService.newMessage({
						title,
						description: (maybeMessage || "").slice(0, 100),
						wa_id: waId,
						...(typeof maybeDate === "string" ? { date: maybeDate } : {}),
						...(typeof maybeTime === "string" ? { time: maybeTime } : {}),
						...(typeof maybeMessage === "string" ? { message: maybeMessage } : {}),
						isLocalized,
					});
				} else if (type === "vacation_period_updated") {
					// Keep silent or minimal toast
				}
			} catch {}
		};
		window.addEventListener("notification:add", handleAny as EventListener);
		return () => {
			window.removeEventListener(
				"notification:add",
				handleAny as EventListener,
			);
		};
	}, [isLocalized, resolveCustomerName]);

	return null;
};
