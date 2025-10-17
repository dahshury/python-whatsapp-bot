"use client";

import { useCallback, useEffect, useRef } from "react";
import type { ConversationMessage } from "@/entities/conversation";

type ScrollTarget = {
	waId?: string;
	date?: string;
	time?: string;
	message?: string;
};

const TIME_SLICE_LENGTH = 5;
const MESSAGE_PREVIEW_LENGTH = 24;
const SCROLL_DELAY_MS = 30;
const INITIAL_SCROLL_DELAY_MS = 50;
const REALTIME_SCROLL_DELAY_MS = 50;

// Helper to check if scroll target is valid for current conversation
function isScrollTargetValid(
	target: ScrollTarget | null,
	selectedConversationId: string | null
): boolean {
	if (!(target && selectedConversationId)) {
		return false;
	}
	const waId = String(target.waId || "");
	return waId === String(selectedConversationId);
}

// Helper to match a message against scroll target
function matchesScrollTarget(
	message: ConversationMessage,
	target: ScrollTarget
): boolean {
	const targetDate = (target.date || "").toString();
	const targetTime = (target.time || "").toString().slice(0, TIME_SLICE_LENGTH);
	const targetMsg = (target.message || "").toString().trim();

	const sameDate = String(message.date || "") === targetDate;
	const sameTime =
		String(message.time || "").slice(0, TIME_SLICE_LENGTH) === targetTime;

	if (!(sameDate && sameTime)) {
		return false;
	}

	if (!targetMsg) {
		return true;
	}

	const text =
		(message as { message?: string; text?: string }).message ||
		(message as { message?: string; text?: string }).text ||
		"";

	return text
		? text.indexOf(targetMsg.slice(0, MESSAGE_PREVIEW_LENGTH)) !== -1
		: false;
}

// Helper to find message index by scroll target
function findMessageIndexByTarget(
	messages: ConversationMessage[],
	target: ScrollTarget | null
): number {
	if (!target) {
		return -1;
	}
	for (let i = 0; i < messages.length; i++) {
		const m = messages[i];
		if (m && matchesScrollTarget(m, target)) {
			return i;
		}
	}
	return -1;
}

// Helper to perform scroll to element
function performScrollToElement(
	messageListRef: React.RefObject<HTMLDivElement>,
	foundIndex: number,
	pendingScrollTargetRef: React.MutableRefObject<ScrollTarget | null>
): void {
	try {
		const el = messageListRef.current?.querySelector(
			`[data-message-index="${foundIndex}"]`
		) as HTMLElement | null;
		if (el && typeof el.scrollIntoView === "function") {
			el.scrollIntoView({ behavior: "smooth", block: "center" });
			pendingScrollTargetRef.current = null;
		}
	} catch {
		// Element may have been unmounted
	}
}

// Helper to check if scroll target can be executed
function canExecuteScrollTarget(
	target: ScrollTarget | null,
	selectedConversationId: string | null
): boolean {
	if (!isScrollTargetValid(target, selectedConversationId)) {
		return false;
	}
	return true;
}

export function useChatScroll(
	selectedConversationId: string | null,
	sortedMessages: ConversationMessage[],
	options?: { preventAutoScroll?: boolean }
) {
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const messageListRef = useRef<HTMLDivElement>(null);
	const pendingScrollTargetRef = useRef<ScrollTarget | null>(null);
	const lastCountRef = useRef<number>(0);
	const lastScrolledConversationIdRef = useRef<string | null>(null);
	const initialScrollPendingRef = useRef<boolean>(false);
	const preventAutoScroll = options?.preventAutoScroll ?? false;

	const tryScrollToTarget = useCallback(() => {
		const target = pendingScrollTargetRef.current;
		if (!canExecuteScrollTarget(target, selectedConversationId)) {
			return;
		}

		const foundIndex = findMessageIndexByTarget(sortedMessages, target);

		if (foundIndex >= 0) {
			performScrollToElement(
				messageListRef as React.RefObject<HTMLDivElement>,
				foundIndex,
				pendingScrollTargetRef
			);
		}
	}, [selectedConversationId, sortedMessages]);

	// Listen for global requests to scroll to a message
	useEffect(() => {
		const onScrollRequest = (e: Event) => {
			try {
				const { wa_id, date, time, message } = (e as CustomEvent).detail || {};
				pendingScrollTargetRef.current = { waId: wa_id, date, time, message };
				setTimeout(() => tryScrollToTarget(), SCROLL_DELAY_MS);
			} catch {
				// Event processing may fail in some contexts
			}
		};
		window.addEventListener(
			"chat:scrollToMessage",
			onScrollRequest as EventListener
		);
		return () =>
			window.removeEventListener(
				"chat:scrollToMessage",
				onScrollRequest as EventListener
			);
	}, [tryScrollToTarget]);

	// On conversation mount/change, check if a target was stashed globally
	useEffect(() => {
		try {
			const w = globalThis as unknown as {
				__chatScrollTarget?: ScrollTarget | null;
			};
			const t = w.__chatScrollTarget ?? null;
			if (t?.waId && String(t.waId) === String(selectedConversationId)) {
				pendingScrollTargetRef.current = t;
				w.__chatScrollTarget = null;
				setTimeout(() => tryScrollToTarget(), INITIAL_SCROLL_DELAY_MS);
			}
		} catch {
			// Global state access may fail in some environments
		}
	}, [selectedConversationId, tryScrollToTarget]);

	// Auto-scroll: on conversation change jump to bottom instantly, then smooth on new messages
	useEffect(() => {
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
	useEffect(() => {
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
					}, REALTIME_SCROLL_DELAY_MS);
				}
			} catch {
				// Event handling may fail in some contexts
			}
		};
		window.addEventListener("realtime", handler as EventListener);
		return () =>
			window.removeEventListener("realtime", handler as EventListener);
	}, [selectedConversationId]);

	return { messageListRef, messagesEndRef, tryScrollToTarget } as const;
}
