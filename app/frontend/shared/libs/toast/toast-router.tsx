"use client";

import { useReservationsData } from "@shared/libs/data/websocket-data-provider";
import { i18n } from "@shared/libs/i18n";
import { isLocalOperation } from "@shared/libs/realtime-utils";
import { Z_INDEX } from "@shared/libs/ui/z-index";
import type { FC } from "react";
import { useCallback, useEffect, useRef } from "react";
import { Toaster } from "sonner";
import { notificationManager } from "@/services/notifications/notification-manager.service";
import { toastService } from "./toast-service";

// Time slice constants
const TIME_SLOT_LENGTH = 5;
const MESSAGE_TRUNCATE_LENGTH = 100;

// Helper to build reservation notification arguments
function buildReservationNotificationArgs(
	typedData: {
		customer_name?: string;
		wa_id?: string;
		date?: string;
		time_slot?: string;
	},
	isLocalized: boolean
) {
	return {
		...(typedData.customer_name !== undefined && {
			customer: typedData.customer_name,
		}),
		wa_id: typedData.wa_id || "",
		date: typedData.date || "",
		time: (typedData.time_slot || "").slice(0, TIME_SLOT_LENGTH),
		isLocalized,
	};
}

export const ToastRouter: FC = () => {
	const { reservations } = useReservationsData();
	const handleAnyRef = useRef<((ev: Event) => void) | null>(null);

	const resolveCustomerName = useCallback(
		(waId?: string, fallbackName?: string): string | undefined => {
			try {
				if (fallbackName && String(fallbackName).trim()) {
					return String(fallbackName);
				}
				const id = String(waId || "");
				if (!id) {
					return;
				}
				const list =
					(
						reservations as
							| Record<string, Array<{ customer_name?: string }>>
							| undefined
					)?.[id] || [];
				for (const r of list) {
					if (r?.customer_name) {
						return String(r.customer_name);
					}
				}
			} catch {
				// Silent: unable to resolve customer name from reservations
			}
			return;
		},
		[reservations]
	);

	const getLocalizationState = useCallback((): boolean => {
		try {
			const loc = localStorage.getItem("locale");
			return Boolean(loc && loc !== "en");
		} catch {
			return false;
		}
	}, []);

	const handleReservationEvent = useCallback(
		(type: string, data: unknown, isLocalized: boolean) => {
			const typedData = data as {
				customer_name?: string;
				wa_id?: string;
				date?: string;
				time_slot?: string;
				id?: string | number;
			};

			// Guard against missing required fields
			if (!(typedData.wa_id && typedData.date)) {
				return;
			}

			// Check if this is a local operation and suppress notification if it is
			if (isLocalOperation(type, typedData)) {
				return;
			}

			if (type === "reservation_created") {
				notificationManager.showReservationCreated(
					buildReservationNotificationArgs(typedData, isLocalized)
				);
			} else if (
				type === "reservation_updated" ||
				type === "reservation_reinstated"
			) {
				notificationManager.showReservationModified(
					buildReservationNotificationArgs(typedData, isLocalized)
				);
			} else if (type === "reservation_cancelled") {
				notificationManager.showReservationCancelled(
					buildReservationNotificationArgs(typedData, isLocalized)
				);
			}
		},
		[]
	);

	const handleMessageEvent = useCallback(
		(data: unknown, isLocalized: boolean) => {
			const messageLabel = i18n.getMessage("toast_new_message", isLocalized);
			const waId = String(
				(data as { wa_id?: string; waId?: string })?.wa_id ||
					(data as { waId?: string }).waId ||
					""
			);
			const name = resolveCustomerName(
				waId,
				(data as { customer_name?: string })?.customer_name
			);
			const who = name || waId;
			const title = `${messageLabel} • ${who}`;
			const maybeDate = (data as { date?: string }).date;
			const maybeTime = (data as { time?: string }).time;
			const maybeMessage = (data as { message?: string }).message;

			toastService.newMessage({
				title,
				description: (maybeMessage || "").slice(0, MESSAGE_TRUNCATE_LENGTH),
				wa_id: waId,
				...(typeof maybeDate === "string" ? { date: maybeDate } : {}),
				...(typeof maybeTime === "string" ? { time: maybeTime } : {}),
				...(typeof maybeMessage === "string" ? { message: maybeMessage } : {}),
				isLocalized,
			});
		},
		[resolveCustomerName]
	);

	const handleEventType = useCallback(
		(type: string, data: unknown, isLocalized: boolean) => {
			const reservationTypes = [
				"reservation_created",
				"reservation_updated",
				"reservation_reinstated",
				"reservation_cancelled",
			];

			if (reservationTypes.includes(type)) {
				handleReservationEvent(type, data, isLocalized);
			} else if (type === "conversation_new_message") {
				handleMessageEvent(data, isLocalized);
			}
		},
		[handleReservationEvent, handleMessageEvent]
	);

	useEffect(() => {
		handleAnyRef.current = (ev: Event) => {
			try {
				const { type, data } = (ev as CustomEvent).detail || {};
				if (!(type && data)) {
					return;
				}
				const isLocalized = getLocalizationState();
				handleEventType(type, data, isLocalized);
			} catch {
				// Silent: error processing notification event
			}
		};

		window.addEventListener(
			"notification:add",
			handleAnyRef.current as EventListener
		);
		return () => {
			if (handleAnyRef.current) {
				window.removeEventListener(
					"notification:add",
					handleAnyRef.current as EventListener
				);
			}
		};
	}, [getLocalizationState, handleEventType]);

	return (
		<Toaster
			gap={8}
			position="bottom-right"
			style={{ zIndex: Z_INDEX.TOASTER }}
			toastOptions={{
				className: "sonner-toast",
				descriptionClassName: "sonner-description",
				style: {
					background: "transparent",
					border: "none",
					// @ts-expect-error custom css var forwarded to CSS
					"--toaster-z": Z_INDEX.TOASTER,
				},
				classNames: {
					toast: "sonner-toast group",
					title: "sonner-title",
					description: "sonner-description",
					actionButton: "sonner-action",
					cancelButton: "sonner-cancel",
					closeButton: "sonner-close",
					error: "sonner-error",
					success: "sonner-success",
					warning: "sonner-warning",
					info: "sonner-info",
				},
			}}
		/>
	);
};
