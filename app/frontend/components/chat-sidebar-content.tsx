"use client";
import { Bot, ChevronUp, MessageSquare } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BasicChatInput } from "@/components/chat/basic-chat-input";
import { ChatMessagesViewport } from "@/components/chat/chat-messages-viewport";
import { ConversationCombobox } from "@/components/conversation-combobox";
import { Button } from "@/components/ui/button";
import { LoadingDots } from "@/components/ui/loading-dots";
import { useChatScroll } from "@/hooks/useChatScroll";
import { useConversationActivity } from "@/hooks/useConversationActivity";
// Replaced Textarea with TipTap's EditorContent for live formatting
import { useCustomerData } from "@/lib/customer-data-context";
import { i18n } from "@/lib/i18n";
import { useLanguage } from "@/lib/language-context";
import { chatService } from "@/lib/services/chat/chat.service";
import { useSettings } from "@/lib/settings-context";
import { useSidebarChatStore } from "@/lib/sidebar-chat-store";
import { toastService } from "@/lib/toast-service";
import { cn } from "@/lib/utils";
import type { Reservation } from "@/types/calendar";
import type { ConversationMessage } from "@/types/conversation";

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
	const { showToolCalls, chatMessageLimit } = useSettings();
	const { isLoadingConversation, setLoadingConversation } =
		useSidebarChatStore();
	const [isSending, setIsSending] = useState(false);
	const [loadedMessageCount, setLoadedMessageCount] =
		useState<number>(chatMessageLimit);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [isAtTop, setIsAtTop] = useState(false);
	const [isTyping, setIsTyping] = useState(false);
	// scrolling refs managed by useChatScroll below

	// Use centralized customer data
	const { conversations: rawConversations, reservations: rawReservations } =
		useCustomerData();

	// Cast conversations to match expected type
	const conversations = rawConversations as unknown as Record<
		string,
		ConversationMessage[]
	>;

	// Cast reservations to match expected type
	const reservations = rawReservations as unknown as Record<
		string,
		Reservation[]
	>;

	// Local state for additional messages (not optimistic - only added on success)
	const [additionalMessages, setAdditionalMessages] = useState<
		Record<string, ConversationMessage[]>
	>({});

	// Log the data state
	// Debug: Conversations and reservations loaded

	const currentConversation = selectedConversationId
		? ((rawConversations[selectedConversationId] ||
				[]) as ConversationMessage[])
		: [];

	// Combine real messages with additional messages for this conversation
	const conversationAdditional = selectedConversationId
		? additionalMessages[selectedConversationId] || []
		: [];
	const allMessages = [
		...currentConversation,
		...conversationAdditional,
	] as ConversationMessage[];

	// Sort messages by date and time
	const sortedMessages = [...allMessages].sort((a, b) => {
		const aTime = new Date(`${a.date} ${a.time}`);
		const bTime = new Date(`${b.date} ${b.time}`);
		return aTime.getTime() - bTime.getTime();
	}) as ConversationMessage[];

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
	const { messageListRef, messagesEndRef } = useChatScroll(
		selectedConversationId,
		limitedMessages,
		{ preventAutoScroll: isLoadingMore },
	);

	// Listen for top-of-scroll state emitted by viewport
	useEffect(() => {
		const handler = (e: Event) => {
			try {
				const { atTop } = (e as CustomEvent).detail || {};
				if (typeof atTop === "boolean") setIsAtTop(atTop);
			} catch {}
		};
		window.addEventListener("chat:scrollTopState", handler as EventListener);
		return () =>
			window.removeEventListener(
				"chat:scrollTopState",
				handler as EventListener,
			);
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
		return () =>
			window.removeEventListener("chat:typing", handler as EventListener);
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
		if (!selectedConversationId || isSending) return;

		setIsSending(true);

		try {
			await chatService.sendConversationMessage(
				selectedConversationId,
				messageText,
			);

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

	// Show combobox only when we have data
	const shouldShowCombobox = Object.keys(conversations).length > 0;

	if (!selectedConversationId) {
		return (
			<div className={cn("flex flex-col h-full bg-card relative", className)}>
				{/* Loading overlay with blur effect */}
				{isLoadingConversation && (
					<div className="absolute inset-0 chat-loading-overlay bg-background/50 backdrop-blur-sm flex items-center justify-center">
						<div className="flex flex-col items-center gap-2">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
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
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
						<p className="text-sm text-muted-foreground">
							{i18n.getMessage("chat_loading_conversation", isLocalized)}
						</p>
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
						<Button
							onClick={handleLoadMore}
							variant="outline"
							size="sm"
							className="text-xs h-7 shadow-md"
						>
							<ChevronUp className="h-3 w-3 mr-1" />
							{isLocalized ? "تحميل المزيد" : "Load More"}
							<span className="ml-1.5 opacity-70">(+{chatMessageLimit})</span>
						</Button>
					</div>
				)}
				<ChatMessagesViewport
					messages={limitedMessages}
					messageListRef={
						messageListRef as unknown as React.RefObject<HTMLDivElement>
					}
					messagesEndRef={
						messagesEndRef as unknown as React.RefObject<HTMLDivElement>
					}
					isLocalized={isLocalized}
					showToolCalls={showToolCalls}
				/>

				{isTyping && (
					<div className="px-4 py-1">
						<div className="w-full py-1 px-2 bg-transparent">
							<article
								className="rounded-lg p-2.5 w-full relative border bg-gradient-to-b from-ring/20 to-ring/10 border-ring/20"
								aria-live="polite"
							>
								<div className="flex items-center gap-2">
									<div
										className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-xs font-medium bg-muted-foreground text-background"
										aria-hidden="true"
									>
										<Bot className="h-3.5 w-3.5" />
									</div>
									<div className="flex-1 min-w-0">
										<div className="text-sm text-muted-foreground">
											<LoadingDots size={4}>
												<span className="text-xs">
													{i18n.getMessage("typing", isLocalized)}
												</span>
											</LoadingDots>
										</div>
									</div>
								</div>
							</article>
						</div>
					</div>
				)}
			</div>

			{/* Message Input - Enhanced textarea with 24h inactivity detection */}
			<div className="input-bubble">
				<div className="uiverse-text-box">
					<div className="uiverse-box-container">
						<BasicChatInput
							onSend={handleSendMessage}
							disabled={!hasConversationSelected || isSending}
							placeholder={inputPlaceholder}
							isSending={isSending}
							isInactive={isInactive}
							inactiveText={
								limitedMessages.length === 0
									? i18n.getMessage(
											"chat_cannot_message_no_conversation",
											isLocalized,
										)
									: i18n.getMessage("chat_messaging_unavailable", isLocalized)
							}
							isLocalized={isLocalized}
						/>
					</div>
				</div>
			</div>
			{/* moved styles to app/frontend/styles/chat.css */}
		</div>
	);
};
