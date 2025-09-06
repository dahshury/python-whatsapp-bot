"use client";

import { markInputRule } from "@tiptap/core";
import Bold from "@tiptap/extension-bold";
import Code from "@tiptap/extension-code";
import Italic from "@tiptap/extension-italic";
import Placeholder from "@tiptap/extension-placeholder";
import Strike from "@tiptap/extension-strike";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import {
	Bold as BoldIcon,
	Bot,
	Clock,
	Code as CodeIcon,
	Italic as ItalicIcon,
	MessageSquare,
	Smile,
	Strikethrough as StrikethroughIcon,
	User,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
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
// Replaced Textarea with TipTap's EditorContent for live formatting
import { useCustomerData } from "@/lib/customer-data-context";
import { i18n } from "@/lib/i18n";
import { useLanguage } from "@/lib/language-context";
import { useSidebarChatStore } from "@/lib/sidebar-chat-store";
import { toastService } from "@/lib/toast-service";
import { cn } from "@/lib/utils";
import type { ConversationMessage, Reservation } from "@/types/calendar";

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

// Normalize simplified formatting markers to proper Markdown before parsing
// - *text* -> **text** (keep _text_ as italic)
// - ~text~ -> ~~text~~
// - `text` already valid
function normalizeSimpleFormattingForMarkdown(input: string): string {
	try {
		if (!input) return "";

		// Protect inline code spans so we do not alter content inside them
		const codePlaceholders: string[] = [];
		let protectedText = input.replace(/`[^`]*`/g, (match) => {
			const token = `<<CODE_${codePlaceholders.length}>>`;
			codePlaceholders.push(match);
			return token;
		});

		// Convert single tilde strikethrough to Markdown double tilde
		protectedText = protectedText.replace(
			/(^|[^~])~([^~\n]+)~(?!~)/g,
			"$1~~$2~~",
		);

		// Convert single asterisk bold to Markdown double asterisks. Avoid lists and existing ** **
		protectedText = protectedText.replace(
			/(^|[^*])\*([^*\n]+)\*(?!\*)/g,
			"$1**$2**",
		);

		// Restore code spans
		const restored = protectedText.replace(
			/<<CODE_(\d+)>>/g,
			(_, i) => codePlaceholders[Number(i)] || "",
		);
		return restored;
	} catch {
		return input;
	}
}

// Custom TipTap input rules to support single-character markers
const SingleAsteriskBold = Bold.extend({
	addInputRules() {
		return [markInputRule({ find: /(?:^|\s)\*([^*]+)\*$/, type: this.type })];
	},
});

const UnderscoreItalic = Italic.extend({
	addInputRules() {
		return [markInputRule({ find: /(?:^|\s)_([^_]+)_$/, type: this.type })];
	},
});

const SingleTildeStrike = Strike.extend({
	addInputRules() {
		return [markInputRule({ find: /(?:^|\s)~([^~]+)~$/, type: this.type })];
	},
});

// Serialize editor HTML back to single-char markers for backend/messages
function serializeHtmlToMarkers(html: string): string {
	try {
		const parser = new DOMParser();
		const doc = parser.parseFromString(html || "", "text/html");
		const walk = (node: Node): string => {
			if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
			const children = Array.from(node.childNodes).map(walk).join("");
			if (!(node instanceof HTMLElement)) return children;
			const tag = node.tagName.toLowerCase();
			if (tag === "strong" || tag === "b") return `*${children}*`;
			if (tag === "em" || tag === "i") return `_${children}_`;
			if (tag === "s" || tag === "del" || tag === "strike")
				return `~${children}~`;
			if (tag === "code") return `\`${children}\``;
			if (tag === "br") return "\n";
			if (tag === "p") return `${children}\n`;
			return children;
		};
		const out = walk(doc.body)
			.replace(/\n{3,}/g, "\n\n")
			.trim();
		return out;
	} catch {
		return html;
	}
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
	const [emojiOpen, setEmojiOpen] = useState(false);
	const editorWrapperRef = useRef<HTMLDivElement>(null);
	const baseMinHeightPx = 70;
	const [maxHeightPx, setMaxHeightPx] = useState(0);
	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				bold: false,
				italic: false,
				strike: false,
				code: false,
			}),
			SingleAsteriskBold,
			UnderscoreItalic,
			SingleTildeStrike,
			Code,
			Placeholder.configure({ placeholder }),
		],
		editorProps: {
			attributes: {
				class: "min-h-[32px] text-xs leading-6 outline-none",
			},
		},
		content: "",
		immediatelyRender: false,
	});

	// Compute max height (40vh) and keep it updated
	useEffect(() => {
		const compute = () => setMaxHeightPx(Math.floor(window.innerHeight * 0.4));
		compute();
		window.addEventListener("resize", compute);
		return () => window.removeEventListener("resize", compute);
	}, []);

	// Auto-grow the editor wrapper height based on content up to maxHeightPx
	useEffect(() => {
		if (!editor) return;
		const adjust = () => {
			try {
				const wrapper = editorWrapperRef.current;
				const pm = editor?.view?.dom as HTMLElement | undefined;
				if (!wrapper || !pm) return;
				// Reset height to allow shrink then measure content
				wrapper.style.height = "auto";
				const desired = Math.max(baseMinHeightPx, pm.scrollHeight);
				const capped = Math.min(
					desired,
					Math.max(maxHeightPx, baseMinHeightPx),
				);
				wrapper.style.height = `${capped}px`;
				pm.style.overflowY =
					capped >= Math.max(maxHeightPx, baseMinHeightPx) ? "auto" : "hidden";
			} catch {}
		};
		// Initial and on updates
		setTimeout(adjust, 0);
		editor.on("update", adjust);
		editor.on("selectionUpdate", adjust);
		editor.on("transaction", adjust);
		return () => {
			try {
				editor.off("update", adjust);
				editor.off("selectionUpdate", adjust);
				editor.off("transaction", adjust);
			} catch {}
		};
	}, [editor, maxHeightPx]);

	// Force re-render on editor selection/transaction updates so toolbar reflects active marks
	const [, forceRerender] = useState(0);
	useEffect(() => {
		if (!editor) return;
		const handler = () => forceRerender((v) => v + 1);
		editor.on("selectionUpdate", handler);
		editor.on("transaction", handler);
		editor.on("update", handler);
		return () => {
			editor.off("selectionUpdate", handler);
			editor.off("transaction", handler);
			editor.off("update", handler);
		};
	}, [editor]);

	// Check if conversation is inactive (last message > 24 hours ago)
	const isInactive = React.useMemo(() => {
		if (!messages.length) return true; // No messages = inactive

		const lastMessage = messages[messages.length - 1];
		if (!lastMessage || !lastMessage.date || !lastMessage.time) return false;

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

	// Ensure editor editability matches state
	useEffect(() => {
		if (!editor) return;
		editor.setEditable(!(disabled || isInactive));
	}, [editor, disabled, isInactive]);

	// Handle emoji selection
	const handleEmojiSelect = ({ emoji }: { emoji: string }) => {
		try {
			editor?.chain().focus().insertContent(emoji).run();
		} finally {
			setEmojiOpen(false);
		}
	};

	// Apply inline wrapper markers around selection (toggle)
	const applyWrap = (marker: string) => {
		if (!editor) return;
		const chain = editor.chain().focus();
		if (marker === "*") chain.toggleBold().run();
		else if (marker === "_") chain.toggleItalic().run();
		else if (marker === "~") chain.toggleStrike().run();
		else if (marker === "`") chain.toggleCode().run();
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

			{!isInactive && (
				<div className="flex items-center gap-1 px-2 py-0.5 bg-muted/40 rounded-md border border-muted">
					{(() => {
						const isActive = !!editor?.isActive("bold");
						const isDisabled =
							isActuallyDisabled ||
							!editor?.can().chain().focus().toggleBold().run();
						return (
							<button
								type="button"
								title="Bold (*text*)"
								disabled={isDisabled}
								onMouseDown={(e) => {
									e.preventDefault();
									applyWrap("*");
								}}
								aria-pressed={isActive}
								className={cn(
									"inline-flex items-center justify-center h-5 w-5 rounded transition-colors disabled:opacity-50",
									isActive
										? "bg-accent text-accent-foreground"
										: "hover:bg-accent hover:text-accent-foreground text-muted-foreground",
									"icon-neon",
								)}
							>
								<BoldIcon className="h-3 w-3" />
							</button>
						);
					})()}
					{(() => {
						const isActive = !!editor?.isActive("italic");
						const isDisabled =
							isActuallyDisabled ||
							!editor?.can().chain().focus().toggleItalic().run();
						return (
							<button
								type="button"
								title="Italic (_text_)"
								disabled={isDisabled}
								onMouseDown={(e) => {
									e.preventDefault();
									applyWrap("_");
								}}
								aria-pressed={isActive}
								className={cn(
									"inline-flex items-center justify-center h-5 w-5 rounded transition-colors disabled:opacity-50",
									isActive
										? "bg-accent text-accent-foreground"
										: "hover:bg-accent hover:text-accent-foreground text-muted-foreground",
									"icon-neon",
								)}
							>
								<ItalicIcon className="h-3 w-3" />
							</button>
						);
					})()}
					{(() => {
						const isActive = !!editor?.isActive("strike");
						const isDisabled =
							isActuallyDisabled ||
							!editor?.can().chain().focus().toggleStrike().run();
						return (
							<button
								type="button"
								title="Strikethrough (~text~)"
								disabled={isDisabled}
								onMouseDown={(e) => {
									e.preventDefault();
									applyWrap("~");
								}}
								aria-pressed={isActive}
								className={cn(
									"inline-flex items-center justify-center h-5 w-5 rounded transition-colors disabled:opacity-50",
									isActive
										? "bg-accent text-accent-foreground"
										: "hover:bg-accent hover:text-accent-foreground text-muted-foreground",
									"icon-neon",
								)}
							>
								<StrikethroughIcon className="h-3 w-3" />
							</button>
						);
					})()}
					{(() => {
						const isActive = !!editor?.isActive("code");
						const isDisabled =
							isActuallyDisabled ||
							!editor?.can().chain().focus().toggleCode().run();
						return (
							<button
								type="button"
								title="Monospace (`text`)"
								disabled={isDisabled}
								onMouseDown={(e) => {
									e.preventDefault();
									applyWrap("`");
								}}
								aria-pressed={isActive}
								className={cn(
									"inline-flex items-center justify-center h-5 w-5 rounded transition-colors disabled:opacity-50",
									isActive
										? "bg-accent text-accent-foreground"
										: "hover:bg-accent hover:text-accent-foreground text-muted-foreground",
									"icon-neon",
								)}
							>
								<CodeIcon className="h-3 w-3" />
							</button>
						);
					})()}
				</div>
			)}

			<div className="flex gap-2 items-start">
				<div
					ref={editorWrapperRef}
					className={cn(
						"flex-1 border border-border rounded-md",
						isActuallyDisabled ? "bg-muted/50" : "bg-background",
						"max-h-[40vh] overflow-hidden",
						"focus-within:ring-1 focus-within:ring-ring focus-within:outline-none",
						"px-3 py-0 leading-6 text-xs",
						isActuallyDisabled && "opacity-60 cursor-not-allowed",
					)}
					style={{ height: `${baseMinHeightPx}px` }}
				>
					<EditorContent
						editor={editor}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !e.shiftKey) {
								e.preventDefault();
								const html = (editor?.getHTML() || "").trim();
								const textOut = serializeHtmlToMarkers(html);
								if (textOut && !isActuallyDisabled && !isSending) {
									onSend(textOut);
									editor?.commands.clearContent(true);
								}
							}
						}}
						className={cn(
							"tiptap h-full w-full",
							"[&_.ProseMirror]:outline-none [&_.ProseMirror]:h-full [&_.ProseMirror]:max-h-full [&_.ProseMirror]:overflow-auto [&_.ProseMirror]:p-0 [&_.ProseMirror_p]:m-0",
							isActuallyDisabled ? "[&_.ProseMirror]:opacity-70" : undefined,
						)}
					/>
				</div>

				<div className="flex flex-col items-stretch gap-2">
					{/* Emoji Picker Button */}
					<Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
						<PopoverTrigger asChild>
							<button
								type="button"
								disabled={isActuallyDisabled}
								className={cn(
									"inline-flex items-center justify-center rounded-md border border-border bg-background px-2 h-8 w-8 text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none transition-colors flex-shrink-0",
									"icon-neon",
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
							const html = (editor?.getHTML() || "").trim();
							const textOut = serializeHtmlToMarkers(html);
							if (textOut && !isActuallyDisabled && !isSending) {
								onSend(textOut);
								editor?.commands.clearContent(true);
							}
						}}
						disabled={
							!((editor?.getText().trim().length || 0) > 0) ||
							isActuallyDisabled ||
							isSending
						}
						className={cn(
							"inline-flex items-center justify-center rounded-md bg-primary px-2 h-8 w-8 text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors flex-shrink-0",
							"icon-neon",
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
								aria-label="Send message"
							>
								<title>Send message</title>
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

// Remove custom lightweight markdown functions

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

	// Parse markdown to HTML (normalize simplified markers first)
	const normalizedMessage = React.useMemo(() => {
		try {
			return normalizeSimpleFormattingForMarkdown(message.message || "");
		} catch {
			return message.message;
		}
	}, [message.message]);

	return (
		<div className="w-full py-1 px-2 bg-transparent">
			<article
				aria-label={`Message from ${message.role}`}
				className={cn(
					"rounded-lg p-2.5 pb-8 w-full relative border",
					message.role === "user" &&
						"bg-gradient-to-b from-primary/15 to-primary/5 border-primary/20",
					message.role === "admin" &&
						"bg-gradient-to-b from-accent/20 to-accent/10 border-accent/20",
					message.role === "assistant" &&
						"bg-gradient-to-b from-ring/20 to-ring/10 border-ring/20",
					message.role === "secretary" &&
						"bg-gradient-to-b from-muted-foreground/20 to-muted-foreground/10 border-muted/30",
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
							"avatar-neon",
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
                prose-li:my-0 prose-pre:my-0.5 prose-code:text-xs break-words whitespace-pre-wrap overflow-x-hidden
                prose-a:[overflow-wrap:anywhere] prose-pre:overflow-x-auto"
						>
							<ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
								{normalizedMessage}
							</ReactMarkdown>
						</div>
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
			</article>
		</div>
	);
};

export const ChatSidebarContent: React.FC<ChatSidebarContentProps> = ({
	selectedConversationId,
	onConversationSelect,
	onRefresh: _onRefresh,
	className,
}) => {
	const { isRTL } = useLanguage();
	const { isLoadingConversation, setLoadingConversation } =
		useSidebarChatStore();
	const [isSending, setIsSending] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const previousConversationIdRef = useRef<string | null>(null);
	const selectedConversationIdRef = useRef<string | null>(null);

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

	// Clear additional messages when conversation changes
	const lastConversationIdRef = useRef<string | null>(null);
	useEffect(() => {
		if (selectedConversationId !== lastConversationIdRef.current) {
			setAdditionalMessages({});
			lastConversationIdRef.current = selectedConversationId;
		}
	}, [selectedConversationId]);

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

	// Auto-scroll: on conversation change jump to bottom instantly, then smooth on new messages
	const lastCountRef = useRef<number>(0);
	const lastScrolledConversationIdRef = useRef<string | null>(null);
	const initialScrollPendingRef = useRef<boolean>(false);
	useEffect(() => {
		const nextCount = sortedMessages.length;
		const conversationChanged =
			selectedConversationId !== lastScrolledConversationIdRef.current;
		if (conversationChanged) {
			// Mark that the first scroll after switching should be instant
			initialScrollPendingRef.current = true;
			lastScrolledConversationIdRef.current = selectedConversationId;
			lastCountRef.current = nextCount;
			// Jump to bottom immediately (no animation) on open
			setTimeout(() => {
				messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
			}, 0);
			return;
		}

		// When new messages append in the same conversation, scroll
		if (nextCount > lastCountRef.current) {
			const behavior = initialScrollPendingRef.current ? "auto" : "smooth";
			messagesEndRef.current?.scrollIntoView({ behavior });
			initialScrollPendingRef.current = false;
			lastCountRef.current = nextCount;
		}
	}, [sortedMessages, selectedConversationId]);

	useEffect(() => {
		selectedConversationIdRef.current = selectedConversationId;
	}, [selectedConversationId]);

	// React to realtime websocket events for the active conversation
	useEffect(() => {
		const handler = (ev: Event) => {
			try {
				const customEvent = ev as CustomEvent;
				const detail = customEvent.detail || {};
				if (
					detail?.type === "conversation_new_message" &&
					detail?.data?.wa_id === selectedConversationIdRef.current
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
				interface GlobalWithLocalOps {
					__localOps?: Set<string>;
				}
				const globalWithOps = globalThis as GlobalWithLocalOps;
				globalWithOps.__localOps =
					globalWithOps.__localOps || new Set<string>();
				const key = `conversation_new_message:${String(selectedConversationId)}:${currentDate}:${currentTime}`;
				globalWithOps.__localOps.add(key);
				setTimeout(() => {
					try {
						globalWithOps.__localOps?.delete(key);
					} catch {}
				}, 5000);
			} catch {}

			// Prefer WebSocket send; fallback to HTTP if unavailable
			const sendViaWS = async (): Promise<boolean> => {
				try {
					interface GlobalWithWS {
						__wsConnection?: { current: WebSocket };
					}
					const globalWithWS = globalThis as GlobalWithWS;
					const wsRef = globalWithWS.__wsConnection;
					if (wsRef?.current?.readyState === WebSocket.OPEN) {
						wsRef.current.send(
							JSON.stringify({
								type: "conversation_send_message",
								data: { wa_id: selectedConversationId, message: messageText },
							}),
						);
						return true;
					}
				} catch {}
				return false;
			};

			const wsOk = await sendViaWS();
			if (!wsOk) {
				// HTTP fallback
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
			}

			// Append message locally
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
			<div className="relative flex-1">
				<div
					className="absolute inset-0 z-0"
					style={{
						background:
							"radial-gradient(ellipse 80% 60% at 50% 0%, hsl(var(--primary) / 0.25), transparent 70%), hsl(var(--card))",
					}}
				/>
				<ThemedScrollbar
					className="flex-1 bg-transparent scrollbar-autohide chat-scrollbar relative z-10"
					style={{ height: "100%" }}
					noScrollX={true}
					rtl={false}
				>
					<div className="message-list px-4 pt-4 pb-2">
						{sortedMessages.length === 0 ? (
							<div className="flex items-center justify-center min-h-[200px] text-muted-foreground p-4">
								<div className="text-center">
									<MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
									<p className="text-sm">
										{i18n.getMessage("chat_no_messages", isRTL)}
									</p>
								</div>
							</div>
						) : (
							<AnimatePresence initial={false}>
								{sortedMessages.map((message, idx) => (
									<motion.div
										key={`${message.date}|${message.time}|${message.role}|${(message.message || "").slice(0, 24)}|${idx}`}
										className={cn(
											"message-row",
											message.role === "user" && "message-row-user",
											message.role === "admin" && "message-row-admin",
											message.role === "assistant" && "message-row-assistant",
											message.role === "secretary" && "message-row-secretary",
										)}
										initial={{ opacity: 0, y: 8 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: -8 }}
										transition={{ duration: 0.18, ease: "easeOut" }}
									>
										<MessageBubble
											message={message}
											isUser={message.role === "user"}
										/>
									</motion.div>
								))}
							</AnimatePresence>
						)}
						<div ref={messagesEndRef} />
					</div>
				</ThemedScrollbar>
			</div>

			{/* Message Input - Enhanced textarea with 24h inactivity detection */}
			<div className="input-bubble">
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
			</div>
			<style jsx>{`
				.input-bubble { margin: 6px 0 8px; width: 100%; border: 1px solid hsl(var(--border)); border-radius: 17px 17px 27px 27px; background-color: hsl(var(--card)); box-shadow: 0px 24px 48px rgba(0,0,0,0.03), 0px 12px 24px rgba(0,0,0,0.05), 0px 6px 12px rgba(0,0,0,0.06); }
				.uiverse-text-box { width: 100%; background-color: hsl(var(--muted)); padding: 10px; border-radius: 12px; }
				.uiverse-box-container { width: 100%; background-color: hsl(var(--background)); border-radius: 8px 8px 21px 21px; padding: 12px; border: 1px solid hsl(var(--border)); }
				.message-list { display: flex; flex-direction: column; gap: 6px; }
				.message-list > .message-row { position: relative; z-index: 1; }
				.message-row { padding: 10px; border-radius: 12px; overflow: hidden; }
				/* Role-specific sexy gradients - enhanced visibility */
				.message-row-user { background: linear-gradient(135deg, hsl(var(--primary) / 0.18) 0%, hsl(var(--primary) / 0.08) 50%, hsl(var(--primary) / 0.12) 100%); }
				.message-row-admin { background: linear-gradient(135deg, hsl(var(--accent) / 0.20) 0%, hsl(var(--accent) / 0.10) 50%, hsl(var(--accent) / 0.14) 100%); }
				.message-row-assistant { background: linear-gradient(135deg, hsl(var(--ring) / 0.18) 0%, hsl(var(--ring) / 0.09) 50%, hsl(var(--ring) / 0.13) 100%); }
				.message-row-secretary { background: linear-gradient(135deg, hsl(var(--muted-foreground) / 0.22) 0%, hsl(var(--muted-foreground) / 0.12) 50%, hsl(var(--muted-foreground) / 0.16) 100%); }

				/* Ensure gradient also applies to the inner bubble for full-width visibility with enhanced colors */
				.message-row-user .rounded-lg { background: linear-gradient(135deg, hsl(var(--primary) / 0.15) 0%, hsl(var(--primary) / 0.06) 50%, hsl(var(--primary) / 0.10) 100%) !important; }
				.message-row-admin .rounded-lg { background: linear-gradient(135deg, hsl(var(--accent) / 0.17) 0%, hsl(var(--accent) / 0.08) 50%, hsl(var(--accent) / 0.12) 100%) !important; }
				.message-row-assistant .rounded-lg { background: linear-gradient(135deg, hsl(var(--ring) / 0.15) 0%, hsl(var(--ring) / 0.07) 50%, hsl(var(--ring) / 0.11) 100%) !important; }
				.message-row-secretary .rounded-lg { background: linear-gradient(135deg, hsl(var(--muted-foreground) / 0.19) 0%, hsl(var(--muted-foreground) / 0.10) 50%, hsl(var(--muted-foreground) / 0.14) 100%) !important; }
				.message-row .rounded-lg { border: 1px solid hsl(var(--border) / 0.4); }

				/* Neon effects */
				.icon-neon { position: relative; isolation: isolate; }
				.icon-neon::after { content: ''; position: absolute; inset: -4px; border-radius: 8px; background: radial-gradient(40% 40% at 50% 50%, currentColor 0%, transparent 60%); filter: blur(8px); opacity: 0; transition: opacity 200ms ease; z-index: -1; }
				.icon-neon:hover::after, .icon-neon:focus-visible::after { opacity: 0.6; }

				.avatar-neon { position: relative; z-index: 0; }
				.avatar-neon > * { position: relative; z-index: 2; }
				.avatar-neon::before { content: ''; position: absolute; inset: -6px; border-radius: 12px; filter: blur(12px); opacity: 0.55; transition: opacity 200ms ease, transform 200ms ease; z-index: 1; }
				.message-row:hover .avatar-neon::before { opacity: 0.9; transform: scale(1.02); }
				/* Role-based neon colors */
				.message-row-user .avatar-neon::before { background: radial-gradient(50% 50% at 50% 50%, hsl(var(--primary)) 0%, transparent 70%); }
				.message-row-admin .avatar-neon::before { background: radial-gradient(50% 50% at 50% 50%, hsl(var(--accent)) 0%, transparent 70%); }
				.message-row-assistant .avatar-neon::before { background: radial-gradient(50% 50% at 50% 50%, hsl(var(--ring)) 0%, transparent 70%); }
				.message-row-secretary .avatar-neon::before { background: radial-gradient(50% 50% at 50% 50%, hsl(var(--muted-foreground)) 0%, transparent 70%); }

				/* Prevent long links from expanding bubble while avoiding mid-word breaks in normal text */
				.prose a { overflow-wrap: anywhere; word-break: normal; white-space: normal; }
				.prose p, .prose li { overflow-wrap: break-word; word-break: normal; }
				.prose code { word-break: break-word; white-space: pre-wrap; }
				.prose pre { white-space: pre; overflow-x: auto; max-width: 100%; }
			`}</style>
		</div>
	);
};
