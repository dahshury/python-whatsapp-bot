"use client";
import { useChatScroll } from "@features/chat/hooks/use-chat-scroll";
import { useConversationActivity } from "@features/chat/hooks/use-conversation-activity";
import { createTypingIndicatorController, sendChatMessage } from "@processes/chat";
// Replaced Textarea with TipTap's EditorContent for live formatting
import { useConversationsData, useReservationsData } from "@shared/libs/data/websocket-data-provider";
import { i18n } from "@shared/libs/i18n";
import { useLanguage } from "@shared/libs/state/language-context";
import { useSettings } from "@shared/libs/state/settings-context";
import { useSidebarChatStore } from "@shared/libs/store/sidebar-chat-store";
import { toastService } from "@shared/libs/toast";
import { cn } from "@shared/libs/utils";
import { Button } from "@ui/button";
import { ChevronUp, MessageSquare } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
// Reservation type no longer needed here after switching to provider hooks
import type { ConversationMessage } from "@/entities/conversation";
import { BasicChatInput } from "@/features/chat/chat/basic-chat-input";
import { ChatMessagesViewport } from "@/features/chat/chat/chat-messages-viewport";
import { ConversationCombobox } from "@/features/chat/conversation-combobox";
import { Spinner } from "@/shared/ui/spinner";

interface ChatSidebarContentProps {
	selectedConversationId: string | null;
	onConversationSelect: (conversationId: string) => void;
	onRefresh?: () => void;
	className?: string;
}

// message bubble moved to components/chat/message-bubble

export const ChatSidebarContent: React.FC<ChatSidebarContentProps> = ({
	selectedConversationId,
	onConversationSelect,
	onRefresh: _onRefresh,
	className,
}) => {
	const { isLocalized } = useLanguage();
	const { showToolCalls, chatMessageLimit, sendTypingIndicator } = useSettings();
	const { isLoadingConversation, setLoadingConversation } = useSidebarChatStore();
	const [isSending, setIsSending] = useState(false);
	const [loadedMessageCount, setLoadedMessageCount] = useState<number>(chatMessageLimit);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [isAtTop, setIsAtTop] = useState(false);
	const [isTyping, setIsTyping] = useState(false);
	// scrolling refs managed by useChatScroll below

	// Source canonical data directly from the websocket provider
	const { conversations } = useConversationsData();
	const { reservations } = useReservationsData();

	// Local state for additional messages (not optimistic - only added on success)
	const [additionalMessages, setAdditionalMessages] = useState<Record<string, ConversationMessage[]>>({});

	// Log the data state
	// Debug: Conversations and reservations loaded

	const currentConversation = selectedConversationId
		? ((conversations[selectedConversationId] || []) as ConversationMessage[])
		: [];

	// Combine real messages with additional messages for this conversation
	const conversationAdditional = selectedConversationId ? additionalMessages[selectedConversationId] || [] : [];
	const allMessages = [...currentConversation, ...conversationAdditional] as ConversationMessage[];

	// Sort messages by robust ISO datetime parsing
	const getMessageTimestamp = (m: ConversationMessage): number => {
		try {
			const date = String((m as { date?: string }).date || "");
			const timeRaw = String((m as { time?: string }).time || "");
			if (!date) return 0;
			let t = timeRaw;
			if (t && /^\d{2}:\d{2}(:\d{2})?$/.test(t)) {
				if (t.length === 5) t = `${t}:00`;
				const d = new Date(`${date}T${t}`);
				return Number.isNaN(d.getTime()) ? 0 : d.getTime();
			}
			const d = new Date(`${date}T00:00:00`);
			return Number.isNaN(d.getTime()) ? 0 : d.getTime();
		} catch {
			return 0;
		}
	};

	const sortedMessages = [...allMessages].sort(
		(a, b) => getMessageTimestamp(a) - getMessageTimestamp(b)
	) as ConversationMessage[];

	// Apply message limit (show last N messages)
	const limitedMessages = useMemo(() => {
		return sortedMessages.slice(-loadedMessageCount);
	}, [sortedMessages, loadedMessageCount]);

	const hasMoreMessages = sortedMessages.length > limitedMessages.length;

	const handleLoadMore = useCallback(() => {
		setIsLoadingMore(true);
		// Use RAF to ensure state updates before scroll calculation
		requestAnimationFrame(() => {
			setLoadedMessageCount((prev) => prev + chatMessageLimit);
			// Reset loading flag after a brief delay
			setTimeout(() => setIsLoadingMore(false), 100);
		});
	}, [chatMessageLimit]);

	// Reset loaded count when conversation changes
	useEffect(() => {
		setLoadedMessageCount(chatMessageLimit);
	}, [chatMessageLimit]);

	// Scrolling handled by dedicated hook
	const { messageListRef, messagesEndRef } = useChatScroll(selectedConversationId, limitedMessages, {
		preventAutoScroll: isLoadingMore,
	});

	// Listen for top-of-scroll state emitted by viewport
	useEffect(() => {
		const handler = (e: Event) => {
			try {
				const { atTop } = (e as CustomEvent).detail || {};
				if (typeof atTop === "boolean") setIsAtTop(atTop);
			} catch {}
		};
		window.addEventListener("chat:scrollTopState", handler as EventListener);
		return () => window.removeEventListener("chat:scrollTopState", handler as EventListener);
	}, []);

	// Clear additional messages when conversation changes
	useEffect(() => {
		setAdditionalMessages({});
	}, []);

	// Listen for typing indicator events for the selected conversation
	useEffect(() => {
		const handler = (ev: Event) => {
			try {
				const { wa_id, typing } = (ev as CustomEvent).detail || {};
				if (!selectedConversationId) return;
				if (String(wa_id) === String(selectedConversationId)) {
					setIsTyping(Boolean(typing));
				}
			} catch {}
		};
		window.addEventListener("chat:typing", handler as EventListener);
		return () => window.removeEventListener("chat:typing", handler as EventListener);
	}, [selectedConversationId]);

	// Monitor when conversation data and rendering is complete
	useEffect(() => {
		if (!isLoadingConversation || !selectedConversationId) return;

		// Determine if we're ready to clear loading:
		// 1. We have the conversations object (API responded)
		// 2. We've processed the current conversation (sortedMessages computed)
		// 3. We know if conversation exists or not

		const apiResponded = conversations !== undefined && conversations !== null;
		const conversationProcessed = currentConversation !== undefined; // This is always an array, even if empty

		if (apiResponded && conversationProcessed) {
			// Everything is ready - clear loading immediately
			setLoadingConversation(false);
		}
	}, [selectedConversationId, conversations, currentConversation, isLoadingConversation, setLoadingConversation]);

	// Auto scroll and realtime handled by useChatScroll

	// Send message function - called by BasicChatInput
	const handleSendMessage = async (messageText: string) => {
		if (!selectedConversationId || isSending) return;

		setIsSending(true);

		try {
			await sendChatMessage(selectedConversationId, messageText);

			// Do not append locally; rely on backend broadcast to update conversations
		} catch (error) {
			console.error("Error sending message:", error);
			const errorMessage = `${i18n.getMessage("chat_message_failed", isLocalized)}: ${error instanceof Error ? error.message : "Unknown error"}`;
			toastService.error(errorMessage);
		} finally {
			setIsSending(false);
		}
	};

	// Simple input state - no complex calculations
	const hasConversationSelected = !!selectedConversationId;
	// Inactivity: last USER message > 24 hours ago
	const isInactive = useConversationActivity(limitedMessages);
	const inputPlaceholder = hasConversationSelected
		? i18n.getMessage("chat_type_message", isLocalized)
		: i18n.getMessage("chat_no_conversation", isLocalized);

	// Emit typing indicator via process controller (throttled) when enabled
	useEffect(() => {
		if (!sendTypingIndicator) return;
		if (!selectedConversationId) return;
		const ctl = createTypingIndicatorController({
			waId: selectedConversationId,
		});

		const onEditorTyping = () => {
			ctl.onUserTyped();
		};

		// Listen to content changes; BasicChatInput attaches TipTap editor inside
		const handler = (e: Event) => {
			try {
				const t = (e as CustomEvent).detail?.type;
				if (t === "chat:editor_update") onEditorTyping();
			} catch {}
		};
		window.addEventListener("chat:editor_event", handler as EventListener);

		// When component unmounts or conversation changes, send a stop
		return () => {
			void ctl.stop();
			window.removeEventListener("chat:editor_event", handler as EventListener);
		};
	}, [sendTypingIndicator, selectedConversationId]);

	// Show combobox only when we have data
	const shouldShowCombobox = Object.keys(conversations).length > 0;

	if (!selectedConversationId) {
		return (
			<div className={cn("flex flex-col h-full bg-card relative", className)}>
				{/* Loading overlay with blur effect */}
				{isLoadingConversation && (
					<div className="absolute inset-0 chat-loading-overlay bg-background/50 backdrop-blur-sm flex items-center justify-center">
						<div className="flex flex-col items-center gap-2">
							<Spinner className="size-6 text-primary" />
							<p className="text-sm text-muted-foreground">
								{i18n.getMessage("chat_loading_conversation", isLocalized)}
							</p>
						</div>
					</div>
				)}

				{/* Header with Omnibox */}
				<div className="p-3 border-b border-sidebar-border bg-card">
					{shouldShowCombobox ? (
						<ConversationCombobox
							conversations={conversations}
							reservations={reservations}
							selectedConversationId={selectedConversationId}
							onConversationSelect={onConversationSelect}
							isLocalized={isLocalized}
						/>
					) : (
						<div className="text-xs text-muted-foreground text-center py-2">
							{i18n.getMessage("chat_loading_conversations", isLocalized)}
						</div>
					)}
				</div>

				{/* Empty State */}
				<div className="flex-1 flex items-center justify-center text-muted-foreground p-4">
					<div className="text-center">
						<MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
						<p className="text-sm">
							{shouldShowCombobox
								? i18n.getMessage("chat_select_conversation", isLocalized)
								: i18n.getMessage("chat_no_conversations", isLocalized)}
						</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className={cn("flex flex-col h-full bg-card relative", className)}>
			{/* Loading overlay with blur effect */}
			{isLoadingConversation && (
				<div className="absolute inset-0 chat-loading-overlay bg-background/50 backdrop-blur-sm flex items-center justify-center">
					<div className="flex flex-col items-center gap-2">
						<Spinner className="size-6 text-primary" />
						<p className="text-sm text-muted-foreground">{i18n.getMessage("chat_loading_conversation", isLocalized)}</p>
					</div>
				</div>
			)}

			{/* Header */}
			<div className="p-3 border-b border-sidebar-border bg-card">
				{/* Conversation Selection Combobox */}
				<ConversationCombobox
					conversations={conversations}
					reservations={reservations}
					selectedConversationId={selectedConversationId}
					onConversationSelect={onConversationSelect}
					isLocalized={isLocalized}
				/>
			</div>

			{/* Messages Area */}
			<div className="flex flex-col flex-1 relative">
				{/* Load More Button - only show when scrolled to top */}
				{hasMoreMessages && isAtTop && (
					<div className="sticky top-0 z-10 p-2 flex justify-center bg-gradient-to-b from-card to-transparent">
						<Button onClick={handleLoadMore} variant="outline" size="sm" className="text-xs h-7 shadow-md">
							<ChevronUp className="h-3 w-3 mr-1" />
							{i18n.getMessage("load_more", isLocalized)}
							<span className="ml-1.5 opacity-70">(+{chatMessageLimit})</span>
						</Button>
					</div>
				)}
				<ChatMessagesViewport
					messages={limitedMessages}
					messageListRef={messageListRef as unknown as React.RefObject<HTMLDivElement>}
					messagesEndRef={messagesEndRef as unknown as React.RefObject<HTMLDivElement>}
					isLocalized={isLocalized}
					showToolCalls={showToolCalls}
					isTyping={isTyping}
				/>
			</div>

			{/* Message Input - Enhanced textarea with 24h inactivity detection */}
			<BasicChatInput
				onSend={handleSendMessage}
				disabled={!hasConversationSelected || isSending}
				placeholder={inputPlaceholder}
				isSending={isSending}
				isInactive={isInactive}
				inactiveText={
					limitedMessages.length === 0
						? i18n.getMessage("chat_cannot_message_no_conversation", isLocalized)
						: i18n.getMessage("chat_messaging_unavailable", isLocalized)
				}
				isLocalized={isLocalized}
			/>
		</div>
	);
};
