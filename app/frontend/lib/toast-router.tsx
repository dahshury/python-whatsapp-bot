"use client";

import * as React from "react";
import { i18n } from "@/lib/i18n";
import { useLanguage } from "@/lib/language-context";
import { notificationManager } from "@/lib/services/notifications/notification-manager.service";
import { toastService } from "@/lib/toast-service";

export const ToastRouter: React.FC = () => {
	const { isLocalized } = useLanguage();

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
					const title = `${messageLabel} • ${data.wa_id}`;
					toastService.newMessage({
						title,
						description: (data.message || "").slice(0, 100),
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
	}, [isLocalized]);

	return null;
};
