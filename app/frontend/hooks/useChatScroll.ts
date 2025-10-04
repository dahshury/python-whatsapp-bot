"use client";

import * as React from "react";
import type { ConversationMessage } from "@/types/conversation";

type ScrollTarget = {
	waId?: string;
	date?: string;
	time?: string;
	message?: string;
};

export function useChatScroll(
	selectedConversationId: string | null,
	sortedMessages: ConversationMessage[],
	options?: { preventAutoScroll?: boolean },
) {
	const messagesEndRef = React.useRef<HTMLDivElement>(null);
	const messageListRef = React.useRef<HTMLDivElement>(null);
	const pendingScrollTargetRef = React.useRef<ScrollTarget | null>(null);
	const lastCountRef = React.useRef<number>(0);
	const lastScrolledConversationIdRef = React.useRef<string | null>(null);
	const initialScrollPendingRef = React.useRef<boolean>(false);
	const preventAutoScroll = options?.preventAutoScroll ?? false;

	const tryScrollToTarget = React.useCallback(() => {
		const target = pendingScrollTargetRef.current;
		if (!target || !selectedConversationId) return;
		const waId = String(target.waId || "");
		if (!waId || waId !== String(selectedConversationId)) return;
		const targetDate = (target.date || "").toString();
		const targetTime = (target.time || "").toString().slice(0, 5);
		const targetMsg = (target.message || "").toString().trim();

		let foundIndex = -1;
		for (let i = 0; i < sortedMessages.length; i++) {
			const m = sortedMessages[i];
			if (!m) continue;
			const sameDate = String(m.date || "") === targetDate;
			const sameTime = String(m.time || "").slice(0, 5) === targetTime;
			if (!sameDate || !sameTime) continue;
			if (targetMsg) {
				const text =
					(m as { message?: string; text?: string }).message ||
					(m as { message?: string; text?: string }).text ||
					"";
				if (text && text.indexOf(targetMsg.slice(0, 24)) === -1) continue;
			}
			foundIndex = i;
			break;
		}

		if (foundIndex >= 0) {
			try {
				const el = messageListRef.current?.querySelector(
					`[data-message-index="${foundIndex}"]`,
				) as HTMLElement | null;
				if (el && typeof el.scrollIntoView === "function") {
					el.scrollIntoView({ behavior: "smooth", block: "center" });
					pendingScrollTargetRef.current = null;
					return;
				}
			} catch {}
		}
	}, [selectedConversationId, sortedMessages]);

	// Listen for global requests to scroll to a message
	React.useEffect(() => {
		const onScrollRequest = (e: Event) => {
			try {
				const { wa_id, date, time, message } = (e as CustomEvent).detail || {};
				pendingScrollTargetRef.current = { waId: wa_id, date, time, message };
				setTimeout(() => tryScrollToTarget(), 30);
			} catch {}
		};
		window.addEventListener(
			"chat:scrollToMessage",
			onScrollRequest as EventListener,
		);
		return () =>
			window.removeEventListener(
				"chat:scrollToMessage",
				onScrollRequest as EventListener,
			);
	}, [tryScrollToTarget]);

	// On conversation mount/change, check if a target was stashed globally
	React.useEffect(() => {
		try {
			const w = globalThis as unknown as {
				__chatScrollTarget?: ScrollTarget | null;
			};
			const t = w.__chatScrollTarget ?? null;
			if (t?.waId && String(t.waId) === String(selectedConversationId)) {
				pendingScrollTargetRef.current = t;
				w.__chatScrollTarget = null;
				setTimeout(() => tryScrollToTarget(), 50);
			}
		} catch {}
	}, [selectedConversationId, tryScrollToTarget]);

	// Auto-scroll: on conversation change jump to bottom instantly, then smooth on new messages
	React.useEffect(() => {
		if (preventAutoScroll) {
			// Update count but skip scrolling
			lastCountRef.current = sortedMessages.length;
			return;
		}

		const nextCount = sortedMessages.length;
		const conversationChanged =
			selectedConversationId !== lastScrolledConversationIdRef.current;
		if (conversationChanged) {
			initialScrollPendingRef.current = true;
			lastScrolledConversationIdRef.current = selectedConversationId;
			lastCountRef.current = nextCount;
			setTimeout(() => {
				messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
			}, 0);
			return;
		}
		if (nextCount > lastCountRef.current) {
			const behavior = initialScrollPendingRef.current ? "auto" : "smooth";
			messagesEndRef.current?.scrollIntoView({ behavior });
			initialScrollPendingRef.current = false;
			lastCountRef.current = nextCount;
		}
	}, [sortedMessages, selectedConversationId, preventAutoScroll]);

	// React to realtime websocket events for the active conversation
	React.useEffect(() => {
		const handler = (ev: Event) => {
			try {
				const customEvent = ev as CustomEvent;
				const detail = customEvent.detail || {};
				if (
					detail?.type === "conversation_new_message" &&
					detail?.data?.wa_id === selectedConversationId
				) {
					setTimeout(() => {
						messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
					}, 50);
				}
			} catch {}
		};
		window.addEventListener("realtime", handler as EventListener);
		return () =>
			window.removeEventListener("realtime", handler as EventListener);
	}, [selectedConversationId]);

	return { messageListRef, messagesEndRef, tryScrollToTarget } as const;
}
