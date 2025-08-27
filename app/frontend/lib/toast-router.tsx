"use client";

import * as React from "react";
import { useLanguage } from "@/lib/language-context";
import { toastService } from "@/lib/toast-service";
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

				// Skip backend toasts for locally-initiated modifications to avoid duplicates.
				if (
					(type === "reservation_updated" ||
						type === "reservation_reinstated") &&
					__local === true
				) {
					return;
				}

				if (type === "reservation_created") {
					toastService.reservationCreated({
						id: data.id,
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
					// Soft toast for modifications
					console.log("🔔 Showing reservation modified toast for:", data);
					toastService.reservationModified({
						id: data.id,
						customer: data.customer_name,
						wa_id: data.wa_id,
						date: data.date,
						time: (data.time_slot || "").slice(0, 5),
						isRTL,
					});
					console.log("🔔 Toast service called successfully");
				} else if (type === "reservation_cancelled") {
					toastService.reservationCancelled({
						id: data.id,
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
		window.addEventListener("realtime", handleAny as EventListener);
		return () => {
			window.removeEventListener(
				"notification:add",
				handleAny as EventListener,
			);
			window.removeEventListener("realtime", handleAny as EventListener);
		};
	}, [isRTL]);

	return null;
};
