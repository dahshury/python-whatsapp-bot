"use client";
import { useChatScroll } from "@features/chat/hooks/use-chat-scroll";
import { useConversationActivity } from "@features/chat/hooks/use-conversation-activity";
import {
	createTypingIndicatorController,
	sendChatMessage,
} from "@processes/chat/chat.process";
// Replaced Textarea with TipTap's EditorContent for live formatting
import {
	useConversationsData,
	useReservationsData,
} from "@shared/libs/data/websocket-data-provider";
import { i18n } from "@shared/libs/i18n";
import { useLanguage } from "@shared/libs/state/language-context";
import { useSettings } from "@shared/libs/state/settings-context";
import { useSidebarChatStore } from "@shared/libs/store/sidebar-chat-store";
import { toastService } from "@shared/libs/toast/toast-service";
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

// Constants for chat operations
const LOADING_STATE_DELAY_MS = 100;
const TIME_FORMAT_LENGTH = 5;
const TIME_TIMESTAMP_PATTERN = /^\d{2}:\d{2}(:\d{2})?$/;

// Helper to extract timestamp from message for sorting
function getMessageTimestamp(m: ConversationMessage): number {
	try {
		const date = String((m as { date?: string }).date || "");
		const timeRaw = String((m as { time?: string }).time || "");
		if (!date) {
			return 0;
		}
		let t = timeRaw;
		if (t && TIME_TIMESTAMP_PATTERN.test(t)) {
			if (t.length === TIME_FORMAT_LENGTH) {
				t = `${t}:00`;
			}
		} else {
			t = "00:00:00";
		}
		const iso = `${date}T${t}`;
		const d = new Date(iso);
		return Number.isNaN(d.getTime()) ? 0 : d.getTime();
	} catch {
		return 0;
	}
}

type ChatSidebarContentProps = {
	selectedConversationId: string | null;
	onConversationSelect: (conversationId: string) => void;
	onRefresh?: () => void;
	className?: string;
};

// message bubble moved to components/chat/message-bubble

export const ChatSidebarContent: React.FC<ChatSidebarContentProps> = ({
	selectedConversationId,
	onConversationSelect,
	onRefresh: _onRefresh,
	className,
}) => {
	const { isLocalized } = useLanguage();
	const { showToolCalls, chatMessageLimit, sendTypingIndicator } =
		useSettings();
	const { isLoadingConversation, setLoadingConversation } =
		useSidebarChatStore();
	const [isSending, setIsSending] = useState(false);
	const [loadedMessageCount, setLoadedMessageCount] =
		useState<number>(chatMessageLimit);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [isAtTop, setIsAtTop] = useState(false);
	const [isTyping, setIsTyping] = useState(false);
	// scrolling refs managed by useChatScroll below

	// Source canonical data directly from the websocket provider
	const { conversations } = useConversationsData();
	const { reservations } = useReservationsData();

	// Local state for additional messages (not optimistic - only added on success)
	const [additionalMessages, setAdditionalMessages] = useState<
		Record<string, ConversationMessage[]>
	>({});

	// Log the data state
	// Debug: Conversations and reservations loaded

	const currentConversation = selectedConversationId
		? ((conversations[selectedConversationId] || []) as ConversationMessage[])
		: [];

	// Combine real messages with additional messages for this conversation
	const conversationAdditional = selectedConversationId
		? additionalMessages[selectedConversationId] || []
		: [];
	const allMessages = [
		...currentConversation,
		...conversationAdditional,
	] as ConversationMessage[];

	// Sort messages by robust ISO datetime parsing
	const sortedMessages = [...allMessages].sort(
		(a, b) => getMessageTimestamp(a) - getMessageTimestamp(b)
	) as ConversationMessage[];

	// Apply message limit (show last N messages)
	const limitedMessages = useMemo(
		() => sortedMessages.slice(-loadedMessageCount),
		[sortedMessages, loadedMessageCount]
	);

	const hasMoreMessages = sortedMessages.length > limitedMessages.length;

	const handleLoadMore = useCallback(() => {
		setIsLoadingMore(true);
		// Use RAF to ensure state updates before scroll calculation
		requestAnimationFrame(() => {
			setLoadedMessageCount((prev) => prev + chatMessageLimit);
			// Reset loading flag after a brief delay
			setTimeout(() => setIsLoadingMore(false), LOADING_STATE_DELAY_MS);
		});
	}, [chatMessageLimit]);

	// Reset loaded count when conversation changes
	useEffect(() => {
		setLoadedMessageCount(chatMessageLimit);
	}, [chatMessageLimit]);

	// Scrolling handled by dedicated hook
	const { messageListRef, messagesEndRef } = useChatScroll(
		selectedConversationId,
		limitedMessages,
		{
			preventAutoScroll: isLoadingMore,
		}
	);

	// Restore scroll position on mounting
	useEffect(() => {
		const handler = (e: Event) => {
			try {
				const { atTop } = (e as CustomEvent).detail || {};
				setIsAtTop(atTop);
			} catch {
				// Event parsing may fail in some contexts
			}
		};
		window.addEventListener("chat:scrollTopState", handler as EventListener);
		return () =>
			window.removeEventListener(
				"chat:scrollTopState",
				handler as EventListener
			);
	}, []);

	// Listen for typing indicator
	useEffect(() => {
		const handler = (e: Event) => {
			try {
				const { typing } = (e as CustomEvent).detail || {};
				setIsTyping(Boolean(typing));
			} catch {
				// Event parsing may fail in some contexts
			}
		};
		window.addEventListener("chat:typing", handler as EventListener);
		return () =>
			window.removeEventListener("chat:typing", handler as EventListener);
	}, []);

	// Listen for editor typing state (with typing indicator controller)
	useEffect(() => {
		if (!sendTypingIndicator) {
			return;
		}
		if (!selectedConversationId) {
			return;
		}
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
				if (t === "chat:editor_update") {
					onEditorTyping();
				}
			} catch {
				// Event handling may fail in some contexts
			}
		};
		window.addEventListener("chat:editor_event", handler as EventListener);

		// When component unmounts or conversation changes, send a stop
		return () => {
			try {
				ctl.stop();
			} catch {
				// Stop command may fail if controller is already stopped
			}
			window.removeEventListener("chat:editor_event", handler as EventListener);
		};
	}, [sendTypingIndicator, selectedConversationId]);

	// Clear additional messages when conversation changes
	useEffect(() => {
		setAdditionalMessages({});
	}, []);

	// Monitor when conversation data and rendering is complete
	useEffect(() => {
		if (!(isLoadingConversation && selectedConversationId)) {
			return;
		}

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
	}, [
		selectedConversationId,
		conversations,
		currentConversation,
		isLoadingConversation,
		setLoadingConversation,
	]);

	// Auto scroll and realtime handled by useChatScroll

	// Send message function - called by BasicChatInput
	const handleSendMessage = async (messageText: string) => {
		if (!selectedConversationId || isSending) {
			return;
		}

		setIsSending(true);
		// Ensure the loading spinner paints before the (often instant) WS send completes
		await new Promise<void>((resolve) => {
			try {
				requestAnimationFrame(() => resolve());
			} catch {
				// Fallback to macrotask if rAF isn't available
				setTimeout(resolve, 0);
			}
		});

		try {
			await sendChatMessage(selectedConversationId, messageText);

			// Do not append locally; rely on backend broadcast to update conversations
		} catch (error) {
			const errorMessage = `${i18n.getMessage("chat_message_failed", isLocalized)}: ${
				error instanceof Error ? error.message : "Unknown error"
			}`;
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

	// Show combobox only when we have data
	const shouldShowCombobox = Object.keys(conversations).length > 0;

	if (!selectedConversationId) {
		return (
			<div className={cn("relative flex h-full flex-col bg-card", className)}>
				{/* Loading overlay with blur effect */}
				{isLoadingConversation && (
					<div className="chat-loading-overlay absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
						<div className="flex flex-col items-center gap-2">
							<Spinner className="size-6 text-primary" />
							<p className="text-muted-foreground text-sm">
								{i18n.getMessage("chat_loading_conversation", isLocalized)}
							</p>
						</div>
					</div>
				)}

				{/* Header with Omnibox */}
				<div className="border-sidebar-border border-b bg-card p-3">
					{shouldShowCombobox ? (
						<ConversationCombobox
							conversations={conversations}
							isLocalized={isLocalized}
							onConversationSelect={onConversationSelect}
							reservations={reservations}
							selectedConversationId={selectedConversationId}
						/>
					) : (
						<div className="py-2 text-center text-muted-foreground text-xs">
							{i18n.getMessage("chat_loading_conversations", isLocalized)}
						</div>
					)}
				</div>

				{/* Empty State */}
				<div className="flex flex-1 items-center justify-center p-4 text-muted-foreground">
					<div className="text-center">
						<MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
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

	// Render conversation
	return (
		<div className={cn("relative flex h-full flex-col bg-card", className)}>
			{/* Loading overlay with blur effect */}
			{isLoadingConversation && (
				<div className="chat-loading-overlay absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
					<div className="flex flex-col items-center gap-2">
						<Spinner className="size-6 text-primary" />
						<p className="text-muted-foreground text-sm">
							{i18n.getMessage("chat_loading_conversation", isLocalized)}
						</p>
					</div>
				</div>
			)}

			{/* Header */}
			<div className="border-sidebar-border border-b bg-card p-3">
				{/* Conversation Selection Combobox */}
				<ConversationCombobox
					conversations={conversations}
					isLocalized={isLocalized}
					onConversationSelect={onConversationSelect}
					reservations={reservations}
					selectedConversationId={selectedConversationId}
				/>
			</div>

			{/* Messages Area */}
			<div className="relative flex flex-1 flex-col">
				{/* Load More Button - only show when scrolled to top */}
				{hasMoreMessages && isAtTop && (
					<div className="sticky top-0 z-10 flex justify-center bg-gradient-to-b from-card to-transparent p-2">
						<Button
							className="h-7 text-xs shadow-md"
							onClick={handleLoadMore}
							size="sm"
							variant="outline"
						>
							<ChevronUp className="mr-1 h-3 w-3" />
							{i18n.getMessage("load_more", isLocalized)}
							<span className="ml-1.5 opacity-70">(+{chatMessageLimit})</span>
						</Button>
					</div>
				)}
				<ChatMessagesViewport
					isLocalized={isLocalized}
					isTyping={isTyping}
					messageListRef={
						messageListRef as unknown as React.RefObject<HTMLDivElement>
					}
					messages={limitedMessages}
					messagesEndRef={
						messagesEndRef as unknown as React.RefObject<HTMLDivElement>
					}
					showToolCalls={showToolCalls}
				/>
			</div>

			{/* Message Input - Enhanced textarea with 24h inactivity detection */}
			<BasicChatInput
				disabled={!hasConversationSelected || isSending}
				inactiveText={
					limitedMessages.length === 0
						? i18n.getMessage(
								"chat_cannot_message_no_conversation",
								isLocalized
							)
						: i18n.getMessage("chat_messaging_unavailable", isLocalized)
				}
				isInactive={isInactive}
				isLocalized={isLocalized}
				isSending={isSending}
				onSend={handleSendMessage}
				placeholder={inputPlaceholder}
			/>
		</div>
	);
};
