"use client";

import { format } from "date-fns";
import { Bot, Clock, MessageSquare, Smile, User } from "lucide-react";
import { marked } from "marked";
import React, { useEffect, useRef, useState } from "react";
import { toastService } from "@/lib/toast-service";
import { ConversationCombobox } from "@/components/conversation-combobox";
import { ThemedScrollbar } from "@/components/themed-scrollbar";
import {
	EmojiPicker,
	EmojiPickerContent,
	EmojiPickerFooter,
	EmojiPickerSearch,
} from "@/components/ui/emoji-picker";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { useCustomerData } from "@/lib/customer-data-context";
import { i18n } from "@/lib/i18n";
import { useLanguage } from "@/lib/language-context";
import { useSidebarChatStore } from "@/lib/sidebar-chat-store";
import { cn } from "@/lib/utils";
import type { ConversationMessage } from "@/types/calendar";

interface ChatSidebarContentProps {
	selectedConversationId: string | null;
	onConversationSelect: (conversationId: string) => void;
	onRefresh?: () => void;
	className?: string;
}

interface MessageBubbleProps {
	message: ConversationMessage;
	isUser: boolean;
}

// Enhanced chat input with shadcn Textarea and 24h inactivity check
const BasicChatInput: React.FC<{
	onSend: (text: string) => void;
	disabled?: boolean;
	placeholder?: string;
	isSending?: boolean;
	messages?: ConversationMessage[];
}> = ({
	onSend,
	disabled = false,
	placeholder = "Type message...",
	isSending = false,
	messages = [],
}) => {
	const { isRTL } = useLanguage();
	const [text, setText] = useState("");
	const [emojiOpen, setEmojiOpen] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	// Check if conversation is inactive (last message > 24 hours ago)
	const isInactive = React.useMemo(() => {
		if (!messages.length) return true; // No messages = inactive

		const lastMessage = messages[messages.length - 1];
		if (!lastMessage.date || !lastMessage.time) return false;

		try {
			const lastMessageDateTime = new Date(
				`${lastMessage.date}T${lastMessage.time}`,
			);
			const now = new Date();
			const hoursDiff =
				(now.getTime() - lastMessageDateTime.getTime()) / (1000 * 60 * 60);
			return hoursDiff > 24;
		} catch (error) {
			console.warn("Error parsing message timestamp:", error);
			return false;
		}
	}, [messages]);

	const isActuallyDisabled = disabled || isInactive;

	// Auto-expand textarea
	const adjustHeight = () => {
		const textarea = textareaRef.current;
		if (textarea) {
			// Reset to minimum height first
			textarea.style.height = "32px";

			// Calculate new height based on content, with minimum of 32px (h-8)
			const scrollHeight = textarea.scrollHeight;
			const maxHeight = window.innerHeight * 0.4; // 40vh
			const newHeight = Math.max(32, Math.min(scrollHeight, maxHeight));

			textarea.style.height = `${newHeight}px`;
		}
	};

	useEffect(() => {
		adjustHeight();
	}, [adjustHeight]);

	// Handle emoji selection
	const handleEmojiSelect = ({ emoji }: { emoji: string }) => {
		const textarea = textareaRef.current;
		if (textarea) {
			const start = textarea.selectionStart;
			const end = textarea.selectionEnd;
			const newText = text.slice(0, start) + emoji + text.slice(end);
			setText(newText);

			// Restore cursor position after emoji insertion
			setTimeout(() => {
				const newCursorPos = start + emoji.length;
				textarea.setSelectionRange(newCursorPos, newCursorPos);
				textarea.focus();
			}, 0);
		}
		setEmojiOpen(false);
	};

	return (
		<div className="space-y-2">
			{isInactive && (
				<div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md border border-muted">
					<Clock className="h-4 w-4 text-muted-foreground" />
					<span className="text-xs text-muted-foreground">
						{messages.length === 0
							? i18n.getMessage("chat_cannot_message_no_conversation", isRTL)
							: i18n.getMessage("chat_messaging_unavailable", isRTL)}
					</span>
				</div>
			)}

			<div className="flex gap-2 items-start">
				<Textarea
					ref={textareaRef}
					value={text}
					onChange={(e) => {
						setText(e.target.value);
					}}
					onKeyDown={(e) => {
						if (e.key === "Enter" && !e.shiftKey) {
							e.preventDefault();
							if (text.trim() && !isActuallyDisabled && !isSending) {
								onSend(text.trim());
								setText("");
							}
						}
					}}
					placeholder={placeholder}
					disabled={isActuallyDisabled}
					className={cn(
						"flex-1 text-xs resize-none",
						"overflow-hidden transition-all duration-200",
						"border-border bg-background",
						"focus-visible:ring-1 focus-visible:ring-ring",
						"h-8 max-h-[40vh] py-0.5 px-3 leading-6",
						isInactive && "opacity-60 cursor-not-allowed",
					)}
					rows={1}
				/>

				<div className="flex flex-col items-stretch gap-2">
					{/* Emoji Picker Button */}
					<Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
						<PopoverTrigger asChild>
							<button
								type="button"
								disabled={isActuallyDisabled}
								className={cn(
									"inline-flex items-center justify-center rounded-md border border-border bg-background px-2 h-8 w-8 text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none transition-colors flex-shrink-0",
								)}
							>
								<Smile className="h-3.5 w-3.5" />
							</button>
						</PopoverTrigger>
						<PopoverContent
							className="w-fit p-0"
							side="top"
							align="end"
							sideOffset={8}
						>
							<EmojiPicker
								className="h-[342px] rounded-lg border shadow-md"
								onEmojiSelect={handleEmojiSelect}
							>
								<EmojiPickerSearch placeholder="Search emoji..." />
								<EmojiPickerContent />
								<EmojiPickerFooter />
							</EmojiPicker>
						</PopoverContent>
					</Popover>

					{/* Send Button */}
					<button
						type="button"
						onClick={(e) => {
							e.preventDefault();
							if (text.trim() && !isActuallyDisabled && !isSending) {
								onSend(text.trim());
								setText("");
							}
						}}
						disabled={!text.trim() || isActuallyDisabled || isSending}
						className={cn(
							"inline-flex items-center justify-center rounded-md bg-primary px-2 h-8 w-8 text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors flex-shrink-0",
						)}
					>
						{isSending ? (
							<div className="animate-spin rounded-full h-3 w-3 border-b border-primary-foreground"></div>
						) : (
							<svg
								className="h-3 w-3"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"
								/>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="m21.854 2.147-10.94 10.939"
								/>
							</svg>
						)}
					</button>
				</div>
			</div>
		</div>
	);
};

// Configure marked for safe HTML
marked.setOptions({
	breaks: true,
	gfm: true,
});

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isUser }) => {
	const [isHovered, setIsHovered] = useState(false);

	const formatDateTime = (dateStr: string, timeStr: string) => {
		try {
			const date = new Date(`${dateStr} ${timeStr}`);
			const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
			const formattedDate = date.toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
			});
			const formattedTime = date.toLocaleTimeString("en-US", {
				hour: "numeric",
				minute: "2-digit",
				hour12: true,
			});
			return `${dayName}, ${formattedDate} • ${formattedTime}`;
		} catch {
			// Fallback to original format if parsing fails
			return `${dateStr} • ${timeStr}`;
		}
	};

	// Parse markdown to HTML
	const messageHtml = React.useMemo(() => {
		try {
			return marked.parse(message.message);
		} catch {
			return message.message;
		}
	}, [message.message]);

	return (
		<div className="w-full py-1 px-2">
			<div
				className={cn(
					"rounded-lg p-2.5 pb-8 w-full relative",
				)}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
			>
				<div className="flex gap-2 items-start">
					{/* Avatar - rounded rectangle style */}
					<div
						className={cn(
							"flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-xs font-medium",
							isUser
								? "bg-primary text-primary-foreground"
								: "bg-muted-foreground text-background",
						)}
					>
						{isUser ? (
							<User className="h-3.5 w-3.5" />
						) : (
							<Bot className="h-3.5 w-3.5" />
						)}
					</div>

					<div className="flex-1 min-w-0">
						{/* Message content with markdown */}
						<div
							className="text-sm prose prose-sm max-w-none
                prose-p:my-0.5 prose-headings:mt-1.5 prose-headings:mb-0.5 prose-ul:my-0.5 prose-ol:my-0.5
                prose-li:my-0 prose-pre:my-0.5 prose-code:text-xs"
							dangerouslySetInnerHTML={{ __html: messageHtml }}
						/>
					</div>
				</div>

				{/* Timestamp positioned inside the rounded container */}
				<div
					className={cn(
						"absolute bottom-2 right-3 flex items-center gap-1 text-[10px] transition-colors",
						isHovered ? "text-muted-foreground/80" : "text-muted-foreground/50",
					)}
				>
					<Clock className="h-2.5 w-2.5" />
					<span>{formatDateTime(message.date, message.time)}</span>
				</div>
			</div>
		</div>
	);
};

export const ChatSidebarContent: React.FC<ChatSidebarContentProps> = ({
	selectedConversationId,
	onConversationSelect,
	onRefresh,
	className,
}) => {
	const { isRTL } = useLanguage();
	const { isLoadingConversation, setLoadingConversation } =
		useSidebarChatStore();
	const [isSending, setIsSending] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const previousConversationIdRef = useRef<string | null>(null);

	// Use centralized customer data
	const { conversations, reservations, loading } = useCustomerData();

	// Local state for additional messages (not optimistic - only added on success)
	const [additionalMessages, setAdditionalMessages] = useState<
		Record<string, ConversationMessage[]>
	>({});

	// Log the data state
	// Debug: Conversations and reservations loaded

	const currentConversation = selectedConversationId
		? conversations[selectedConversationId] || []
		: [];

	// Combine real messages with additional messages for this conversation
	const conversationAdditional = selectedConversationId
		? additionalMessages[selectedConversationId] || []
		: [];
	const allMessages = [...currentConversation, ...conversationAdditional];

	// Sort messages by date and time
	const sortedMessages = React.useMemo(() => {
		return [...allMessages].sort((a, b) => {
			const aTime = new Date(`${a.date} ${a.time}`);
			const bTime = new Date(`${b.date} ${b.time}`);
			return aTime.getTime() - bTime.getTime();
		});
	}, [allMessages]);

	// Clear additional messages when conversation changes
	useEffect(() => {
		setAdditionalMessages({});
	}, []);

	// Monitor when conversation data and rendering is complete
	useEffect(() => {
		if (!isLoadingConversation || !selectedConversationId) return;

		// Track conversation change
		const conversationChanged =
			selectedConversationId !== previousConversationIdRef.current;
		if (conversationChanged) {
			previousConversationIdRef.current = selectedConversationId;
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

	// Auto-scroll to bottom when messages change
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, []);

	// Send message function - called by BasicChatInput
	const handleSendMessage = async (messageText: string) => {
		if (!selectedConversationId || isSending) return;

		setIsSending(true);

		try {
			const now = new Date();
			const currentDate = format(now, "yyyy-MM-dd");
			const currentTime = format(now, "HH:mm");

			// Mark this outgoing message as a local operation to prevent unread badge increments
			try {
				(globalThis as any).__localOps = (globalThis as any).__localOps || new Set<string>();
				const key = `conversation_new_message:${String(selectedConversationId)}:${currentDate}:${currentTime}`;
				(globalThis as any).__localOps.add(key);
				setTimeout(() => { try { (globalThis as any).__localOps.delete(key); } catch {} }, 5000);
			} catch {}

			// Send WhatsApp message
			const sendResponse = await fetch("/api/message/send", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					wa_id: selectedConversationId,
					text: messageText,
				}),
			});

			if (!sendResponse.ok) {
				const errorData = await sendResponse.json();
				throw new Error(errorData.message || "Failed to send message");
			}

			// Append message to conversation database
			const appendResponse = await fetch(
				`/api/message/append?wa_id=${selectedConversationId}`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						role: "admin",
						message: messageText,
						date: currentDate,
						time: currentTime,
					}),
				},
			);

			if (!appendResponse.ok) {
				const errorData = await appendResponse.json();
				throw new Error(
					errorData.message || "Failed to append message to conversation",
				);
			}

			// SUCCESS: Add message directly to local state (no refresh needed)
			const newMessage: ConversationMessage = {
				role: "admin",
				message: messageText,
				date: currentDate,
				time: currentTime,
			};

			setAdditionalMessages((prev) => ({
				...prev,
				[selectedConversationId]: [
					...(prev[selectedConversationId] || []),
					newMessage,
				],
			}));

			// Show success toast
			toastService.success(i18n.getMessage("chat_message_sent", isRTL));
		} catch (error) {
			console.error("Error sending message:", error);
			const errorMessage = `${i18n.getMessage("chat_message_failed", isRTL)}: ${error instanceof Error ? error.message : "Unknown error"}`;
			toastService.error(errorMessage);
		} finally {
			setIsSending(false);
		}
	};

	// Simple input state - no complex calculations
	const hasConversationSelected = !!selectedConversationId;
	const inputDisabled = !hasConversationSelected || isSending;
	const inputPlaceholder = hasConversationSelected
		? i18n.getMessage("chat_type_message", isRTL)
		: i18n.getMessage("chat_no_conversation", isRTL);

	// Show combobox only when we have data
	const shouldShowCombobox = Object.keys(conversations).length > 0;

	if (!selectedConversationId) {
		return (
			<div className={cn("flex flex-col h-full bg-card relative", className)}>
				{/* Loading overlay with blur effect */}
				{isLoadingConversation && (
					<div className="absolute inset-0 chat-loading-overlay bg-background/50 backdrop-blur-sm flex items-center justify-center">
						<div className="flex flex-col items-center gap-2">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
							<p className="text-sm text-muted-foreground">
								{i18n.getMessage("chat_loading_conversation", isRTL)}
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
							isRTL={isRTL}
						/>
					) : (
						<div className="text-xs text-muted-foreground text-center py-2">
							{i18n.getMessage("chat_loading_conversations", isRTL)}
						</div>
					)}
				</div>

				{/* Empty State */}
				<div className="flex-1 flex items-center justify-center text-muted-foreground p-4">
					<div className="text-center">
						<MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
						<p className="text-sm">
							{shouldShowCombobox
								? i18n.getMessage("chat_select_conversation", isRTL)
								: i18n.getMessage("chat_no_conversations", isRTL)}
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
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
						<p className="text-sm text-muted-foreground">
							{i18n.getMessage("chat_loading_conversation", isRTL)}
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
					isRTL={isRTL}
				/>
			</div>

			{/* Messages Area */}
			<ThemedScrollbar
				className="flex-1 bg-card scrollbar-autohide chat-scrollbar"
				style={{ height: "100%" }}
				noScrollX={true}
				rtl={false}
			>
				<div className="uiverse-card">
					<div className="uiverse-title">{isRTL ? "الرسائل" : "Messages"}</div>
					<div className="uiverse-comments">
						<div className="uiverse-message-list">
							{sortedMessages.length === 0 ? (
								<div className="uiverse-empty">
									<div className="text-center">
										<MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
										<p className="text-sm">{i18n.getMessage("chat_no_messages", isRTL)}</p>
									</div>
								</div>
							) : (
								sortedMessages.map((message, idx) => (
									<div key={idx} className={cn("message-row", message.role === "user" ? "message-row-user" : "message-row-admin") }>
										<MessageBubble message={message} isUser={message.role === "user"} />
									</div>
								))
							)}
							<div ref={messagesEndRef} />
						</div>
					</div>
				</div>
			</ThemedScrollbar>

			{/* Message Input - Enhanced textarea with 24h inactivity detection */}
			<div className="uiverse-text-box">
				<div className="uiverse-box-container">
					<BasicChatInput
						onSend={handleSendMessage}
						disabled={inputDisabled}
						placeholder={inputPlaceholder}
						isSending={isSending}
						messages={sortedMessages}
					/>
				</div>
			</div>
			<style jsx>{`
				.uiverse-card { width: 100%; background-color: hsl(var(--card)); box-shadow: 0px 187px 75px rgba(0,0,0,0.01), 0px 105px 63px rgba(0,0,0,0.05), 0px 47px 47px rgba(0,0,0,0.09), 0px 12px 26px rgba(0,0,0,0.1); border-radius: 17px 17px 27px 27px; border: 1px solid hsl(var(--border)); }
				.uiverse-title { height: 50px; display: flex; align-items: center; padding-left: 20px; border-bottom: 1px solid hsl(var(--border)); font-weight: 700; font-size: 13px; color: hsl(var(--card-foreground)); position: relative; }
				.uiverse-title::after { content: ''; width: 8ch; height: 1px; position: absolute; bottom: -1px; background-color: hsl(var(--foreground)); }
				.uiverse-comments { display: grid; grid-template-columns: 1fr; gap: 0px; padding: 20px; }
				.uiverse-message-list { display: flex; flex-direction: column; gap: 10px; }
				.uiverse-empty { display: flex; align-items: center; justify-content: center; min-height: 200px; color: hsl(var(--muted-foreground)); padding: 1rem; }
				.message-row { padding: 10px; border-radius: 12px; overflow: hidden; }
				/* Role-specific subtle gradients */
				.message-row-user { background: linear-gradient(180deg, hsl(var(--primary) / 0.12) 0%, hsl(var(--primary) / 0.04) 100%); }
				.message-row-admin { background: linear-gradient(180deg, hsl(var(--accent) / 0.14) 0%, hsl(var(--accent) / 0.06) 100%); }
				.comment-container { display: flex; flex-direction: column; gap: 10px; }
				.comment-container .user { display: grid; grid-template-columns: 40px 1fr; gap: 10px; }
				.comment-container .user .user-pic { width: 40px; height: 40px; position: relative; display: flex; align-items: center; justify-content: center; background-color: hsl(var(--muted)); border-radius: 50%; color: hsl(var(--muted-foreground)); }
				.comment-container .user .user-pic:after { content: ''; width: 9px; height: 9px; position: absolute; right: 0px; bottom: 0px; border-radius: 50%; background-color: #0fc45a; border: 2px solid hsl(var(--card)); }
				.comment-container .user .user-info { display: flex; flex-direction: column; align-items: flex-start; justify-content: center; gap: 3px; }
				.comment-container .user .user-info span { font-weight: 700; font-size: 12px; color: hsl(var(--foreground)); }
				.comment-container .user .user-info p { font-weight: 600; font-size: 10px; color: hsl(var(--muted-foreground)); }
				.comment-container .comment-content { font-size: 12px; line-height: 16px; font-weight: 600; color: hsl(var(--foreground)); }
				.uiverse-text-box { width: 100%; background-color: hsl(var(--muted)); padding: 8px; border-radius: 12px; }
				.uiverse-box-container { background-color: hsl(var(--background)); border-radius: 8px 8px 21px 21px; padding: 8px; border: 1px solid hsl(var(--border)); }
				/* optional: subtle bottom rounding hint to emulate drop blending with card */
				.uiverse-text-box + .uiverse-text-box { border-top-left-radius: 0; border-top-right-radius: 0; }
			`}</style>
		</div>
		);
	};
