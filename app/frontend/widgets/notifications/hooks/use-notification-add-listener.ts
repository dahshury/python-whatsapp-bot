"use client";

import { i18n } from "@shared/libs/i18n";
import type { NotificationItem } from "@shared/libs/notifications/types";
import React from "react";

// Constants
const MAX_NOTIFICATIONS = 2000;

type Params = {
	open: boolean;
	isLocalized: boolean;
	resolveCustomerName: (
		waId?: string,
		fallbackName?: string
	) => string | undefined;
	setItems: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
};

type NotificationData = {
	id?: string;
	wa_id?: string;
	customer_name?: string;
	date?: string;
	time_slot?: string;
	role?: string;
	sender?: string;
	message?: string;
};

function resolveNotificationText(
	type: string,
	data: NotificationData,
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

function isLocalOperation(__local: unknown, compositeKey: string): boolean {
	try {
		const localOps: Set<string> | undefined = (
			globalThis as { __localOps?: Set<string> }
		).__localOps;
		const isLocal = __local === true || !!localOps?.has(compositeKey);
		if (isLocal) {
			// Clear local marker
			localOps?.delete(compositeKey);
		}
		return isLocal;
	} catch {
		// Ignore errors when checking local operations
		return false;
	}
}

function shouldSuppressMessage(data: NotificationData): boolean {
	if (!data) {
		return false;
	}
	try {
		const role = String(
			(data as { role?: string; sender?: string })?.role ||
				(data as { role?: string; sender?: string })?.sender ||
				""
		).toLowerCase();
		return !!(role && role !== "user" && role !== "customer");
	} catch {
		// Ignore errors when checking message role
		return false;
	}
}

export function useNotificationAddListener({
	open,
	isLocalized,
	resolveCustomerName,
	setItems,
}: Params) {
	React.useEffect(() => {
		const handler = (ev: Event) => {
			const { type, data, ts, __local } = (ev as CustomEvent).detail || {};
			if (!type) {
				return;
			}
			// Revert: no filtering here; source filtering happens upstream
			const timestamp = Number(ts) || Date.now();
			const compositeKey = `${type}:${data?.id ?? data?.wa_id ?? ""}:${data?.date ?? ""}:${data?.time_slot ?? ""}`;

			// Check if this is a local operation and suppress if it is
			if (isLocalOperation(__local, compositeKey)) {
				return;
			}

			// Suppress assistant-authored chat messages in notifications panel only
			if (
				type === "conversation_new_message" &&
				shouldSuppressMessage(data as NotificationData)
			) {
				return;
			}

			const text = resolveNotificationText(
				type,
				data as NotificationData,
				isLocalized,
				resolveCustomerName
			);
			const uniqueId = `${timestamp}:${compositeKey}`;
			setItems((prev) => {
				if (prev.some((i) => i.id === uniqueId)) {
					return prev;
				}
				const shouldMarkUnread = !open; // mirror previous behavior: don't increment when open
				return [
					{
						id: uniqueId,
						text,
						timestamp,
						unread: shouldMarkUnread,
						type: String(type),
						data: data as Record<string, unknown>,
					},
					...prev,
				].slice(0, MAX_NOTIFICATIONS);
			});
		};
		window.addEventListener("notification:add", handler as EventListener);
		return () =>
			window.removeEventListener("notification:add", handler as EventListener);
	}, [isLocalized, open, resolveCustomerName, setItems]);
}
