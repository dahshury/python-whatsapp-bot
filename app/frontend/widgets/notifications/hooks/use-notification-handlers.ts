"use client";

import type { NotificationItem } from "@shared/libs/notifications/types";
import { getWaId } from "@shared/libs/notifications/utils";
import { useSidebarChatStore } from "@shared/libs/store/sidebar-chat-store";
import React from "react";

type Params = {
	setItems: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
	setOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

type ChatScrollTarget = {
	waId: string;
	date?: string;
	time?: string;
	message?: string;
};

function handleChatScrollToMessage(
	waId: string,
	data: {
		date?: string;
		time?: string;
		message?: string;
	}
): void {
	try {
		(
			globalThis as unknown as { __chatScrollTarget?: unknown }
		).__chatScrollTarget = {
			waId,
			date: data.date,
			time: data.time,
			message: data.message,
		} as ChatScrollTarget;
	} catch {
		// Ignore errors when setting chat scroll target
	}

	try {
		const evt = new CustomEvent("chat:scrollToMessage", {
			detail: {
				wa_id: waId,
				date: data.date,
				time: data.time,
				message: data.message,
			},
		});
		window.dispatchEvent(evt);
	} catch {
		// Ignore errors when dispatching chat scroll event
	}
}

export function useNotificationHandlers({ setItems, setOpen }: Params) {
	const handleMarkAllAsRead = React.useCallback(() => {
		setItems((prev) => prev.map((n) => ({ ...n, unread: false })));
	}, [setItems]);

	const handleNotificationClick = React.useCallback(
		(notification: NotificationItem) => {
			setItems((prev) =>
				prev.map((n) =>
					n.id === notification.id ? { ...n, unread: false } : n
				)
			);

			if (
				notification.type === "conversation_new_message" &&
				notification.data
			) {
				const data = notification.data as {
					wa_id?: string;
					waId?: string;
					date?: string;
					time?: string;
					message?: string;
					role?: string;
				};
				const waId = String(data.wa_id || data.waId || "");
				if (waId) {
					try {
						useSidebarChatStore.getState().openConversation(waId);
					} catch {
						// Ignore errors when opening conversation
					}
					handleChatScrollToMessage(waId, data);
				}
			}

			setOpen(false);
		},
		[setItems, setOpen]
	);

	const handleGroupClick = React.useCallback(
		(waId: string, date: string) => {
			setItems((prev) =>
				prev.map((n) => {
					if (
						n.type === "conversation_new_message" &&
						getWaId(n.data) === waId &&
						String((n.data as { date?: string } | undefined)?.date || "") ===
							String(date || "")
					) {
						return { ...n, unread: false };
					}
					return n;
				})
			);
			try {
				if (waId) {
					useSidebarChatStore.getState().openConversation(waId);
				}
			} catch {
				// Ignore errors when opening conversation
			}
			setOpen(false);
		},
		[setItems, setOpen]
	);

	return {
		handleMarkAllAsRead,
		handleNotificationClick,
		handleGroupClick,
	} as const;
}
