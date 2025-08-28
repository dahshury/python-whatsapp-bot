"use client";

import * as React from "react";
import { useLanguage } from "@/lib/language-context";
import { toastService } from "@/lib/toast-service";
import { notificationManager } from "@/lib/services/notifications/notification-manager.service";
import { i18n } from "@/lib/i18n";

export const ToastRouter: React.FC = () => {
	const { isRTL } = useLanguage();

	React.useEffect(() => {
		const handleAny = (ev: Event) => {
			try {
				const { type, data, __local } = (ev as CustomEvent).detail || {};
				console.log("🔔 ToastRouter received event:", { type, data, __local });
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
						isRTL,
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
						isRTL,
					});
				} else if (type === "reservation_cancelled") {
					// Use centralized notification manager for WebSocket cancellation echoes
					notificationManager.showReservationCancelled({
						customer: data.customer_name,
						wa_id: data.wa_id,
						date: data.date,
						time: (data.time_slot || "").slice(0, 5),
						isRTL,
					});
				} else if (type === "conversation_new_message") {
					const messageLabel = i18n.getMessage("toast_new_message", isRTL);
					const title = `${messageLabel} • ${data.wa_id}`;
					toastService.newMessage({
						title,
						description: (data.message || "").slice(0, 100),
						isRTL,
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
	}, [isRTL]);

	return null;
};
