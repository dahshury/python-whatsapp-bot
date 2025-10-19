"use client";

import { i18n } from "@shared/libs/i18n";
import { cn } from "@shared/libs/utils";
import { normalizeTimeToHHmm } from "@shared/libs/utils/date-format";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, MessageSquare } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// Note: type-only React import above; no need to import React runtime here
import type { ConversationMessage } from "@/entities/conversation";
import { LoadingDots } from "@/shared/ui/loading-dots";
import { GridPattern } from "@/shared/ui/magicui/grid-pattern";
import { ThemedScrollbar } from "@/shared/ui/themed-scrollbar";
import { MessageBubble } from "./message-bubble";
import { ToolCallGroup } from "./tool-call-group";

// Type for tool call extraction
type ToolCallInfo = { kind: "tool" | "result"; name: string; text?: string };

// Constants for tool/result extraction and animation
const TOOL_NAME_PATTERN = /Tool:\s*([^<]+)/;
const RESULT_NAME_PATTERN = /Result:\s*([^<]+)/;
const _ANIMATION_DURATION_LONG = 0.2;
const _ANIMATION_DURATION_SHORT = 0.16;
const EASE_CUBIC_BEZIER_X1 = 0.4;
const EASE_CUBIC_BEZIER_Y1 = 0;
const EASE_CUBIC_BEZIER_X2 = 0.2;
const EASE_CUBIC_BEZIER_Y2 = 1;
const EASE_CUBIC_ALT_X1 = 0.45;
const EASE_CUBIC_ALT_Y1 = 0;
const EASE_CUBIC_ALT_X2 = 0.55;
const EASE_CUBIC_ALT_Y2 = 1;
const _ANIMATION_EASE_CUBIC = [
	EASE_CUBIC_BEZIER_X1,
	EASE_CUBIC_BEZIER_Y1,
	EASE_CUBIC_BEZIER_X2,
	EASE_CUBIC_BEZIER_Y2,
] as const;
const _ANIMATION_EASE_CUBIC_ALT = [
	EASE_CUBIC_ALT_X1,
	EASE_CUBIC_ALT_Y1,
	EASE_CUBIC_ALT_X2,
	EASE_CUBIC_ALT_Y2,
] as const;

// Helper to extract tool call info from message
function extractToolCallInfo(m: ConversationMessage): ToolCallInfo | null {
	try {
		const raw = String((m as { message?: string }).message || "");
		if (raw.startsWith("<summary>Tool:")) {
			const match = raw.match(TOOL_NAME_PATTERN);
			if (match?.[1]) {
				return { kind: "tool", name: match[1], text: raw };
			}
		}
		if (raw.startsWith("<summary>Result:")) {
			const match = raw.match(RESULT_NAME_PATTERN);
			if (match?.[1]) {
				return { kind: "result", name: match[1], text: raw };
			}
		}
		return null;
	} catch {
		return null;
	}
}

// Helper to create tool group item
function createToolGroupItem(
	m: ConversationMessage,
	name: string,
	argsText: string,
	resultText: string
): GroupItem {
	return {
		type: "tool_group",
		key: `${m.date || ""}|${m.time || ""}|${name}`,
		name,
		argsText: argsText || "",
		resultText: resultText || "",
		date: m.date || "",
		time: m.time || "",
	};
}

// Helper to handle tool message processing
function processToolMessage(
	m: ConversationMessage,
	messages: ConversationMessage[],
	index: number,
	parsed: ToolCallInfo
): { items: RenderItem[]; nextIndex: number } | null {
	const next = messages[index + 1];
	const nextParsed = next ? extractToolCallInfo(next) : null;

	// Check if next message is matching result
	if (
		nextParsed &&
		nextParsed.kind === "result" &&
		nextParsed.name.toLowerCase() === parsed.name.toLowerCase()
	) {
		// Pair tool args + result
		if (parsed.text || nextParsed.text) {
			return {
				items: [
					createToolGroupItem(
						m,
						parsed.name,
						parsed.text || "",
						nextParsed.text || ""
					),
				],
				nextIndex: index + 1, // consume the result message
			};
		}
		return { items: [], nextIndex: index + 1 };
	}

	// Only tool args present
	if (parsed.text) {
		return {
			items: [createToolGroupItem(m, parsed.name, parsed.text || "", "")],
			nextIndex: index,
		};
	}

	// Skip rendering empty-only tool stub
	return { items: [], nextIndex: index };
}

// Helper to handle result message processing
function processResultMessage(
	m: ConversationMessage,
	index: number,
	parsed: ToolCallInfo
): { items: RenderItem[]; nextIndex: number } | null {
	if (parsed.text) {
		return {
			items: [createToolGroupItem(m, parsed.name, "", parsed.text || "")],
			nextIndex: index,
		};
	}
	// Skip empty-only result stub
	return { items: [], nextIndex: index };
}

// Type definitions for render items
type GroupItem = {
	type: "tool_group";
	key: string;
	name: string;
	argsText: string;
	resultText: string;
	date: string;
	time: string;
};
type MsgItem = { type: "message"; message: ConversationMessage };
type RenderItem = GroupItem | MsgItem;

// Helper to process a single message into render items
function processMessageForRender(
	m: ConversationMessage,
	messages: ConversationMessage[],
	index: number
): { items: RenderItem[]; nextIndex: number } | null {
	const parsed = extractToolCallInfo(m);
	const role = String((m as { role?: string }).role || "")
		.trim()
		.toLowerCase();

	// If this is a tool message or parsed tool call
	if (role === "tool" || parsed) {
		if (parsed?.kind === "tool") {
			return processToolMessage(m, messages, index, parsed);
		}

		if (parsed?.kind === "result") {
			return processResultMessage(m, index, parsed);
		}

		// If undecidable but role===tool without content, drop it
		return { items: [], nextIndex: index };
	}

	// Regular message
	return { items: [{ type: "message", message: m }], nextIndex: index };
}

// Build grouped render model
function buildRenderItemsArray(messages: ConversationMessage[]): RenderItem[] {
	const out: RenderItem[] = [];
	let i = 0;
	while (i < messages.length) {
		const m = messages[i];
		if (!m) {
			i += 1;
			continue;
		}

		const result = processMessageForRender(m, messages, i);
		if (result) {
			out.push(...result.items);
			i = result.nextIndex + 1;
		} else {
			i += 1;
		}
	}
	return out;
}

// Component to render a single item
function RenderItemComponent({ item, idx }: { item: RenderItem; idx: number }) {
	const isGroup = (item as { type?: string }).type === "tool_group";

	if (isGroup) {
		const groupItem = item as GroupItem;
		return (
			<AnimatePresence key={`${groupItem.key}|${idx}`}>
				<motion.div
					animate={{
						opacity: 1,
						height: "auto",
						marginBottom: 8,
					}}
					className="message-row"
					data-message-index={idx}
					data-role="tool"
					exit={{ opacity: 0, height: 0, marginBottom: 0 }}
					initial={{ opacity: 0, height: 0, marginBottom: 0 }}
					style={{ overflow: "hidden" }}
					transition={{
						duration: _ANIMATION_DURATION_LONG,
						ease: _ANIMATION_EASE_CUBIC,
					}}
				>
					<ToolCallGroup
						argsText={groupItem.argsText || ""}
						resultText={groupItem.resultText || ""}
						toolName={groupItem.name}
						valueKey={groupItem.key}
					/>
				</motion.div>
			</AnimatePresence>
		);
	}

	// Render message with smooth enter/exit + layout animations
	const msgItem = item as MsgItem;
	const message = msgItem.message;
	const role = String((message as { role?: string }).role || "")
		.trim()
		.toLowerCase();

	const messageKey = `${message?.date}|${message?.time}|${role}|${String(
		message?.message || ""
	).slice(0, 24)}|${idx}`;

	return (
		<AnimatePresence>
			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className={cn(
					"message-row",
					role === "user" && "message-row-user",
					role === "admin" && "message-row-admin",
					role === "assistant" && "message-row-assistant",
					role === "secretary" && "message-row-secretary"
				)}
				data-message-date={
					(message as { date?: string } | undefined)?.date || ""
				}
				data-message-index={idx}
				data-message-time={normalizeTimeToHHmm(
					(message as { time?: string } | undefined)?.time || ""
				)}
				data-role={role}
				exit={{ opacity: 0, y: -6 }}
				initial={{ opacity: 0, y: 6 }}
				key={messageKey}
				layout
				transition={{
					duration: _ANIMATION_DURATION_SHORT,
					ease: _ANIMATION_EASE_CUBIC_ALT,
				}}
			>
				<MessageBubble isUser={role === "user"} message={message} />
			</motion.div>
		</AnimatePresence>
	);
}

// Scroll distance threshold (pixels) to consider at bottom
const SCROLL_AT_BOTTOM_THRESHOLD = 8;

export function ChatMessagesViewport({
	messages,
	messageListRef,
	messagesEndRef,
	isLocalized,
	showToolCalls = true,
	isTyping,
}: {
	messages: ConversationMessage[];
	messageListRef: React.RefObject<HTMLDivElement>;
	messagesEndRef: React.RefObject<HTMLDivElement>;
	isLocalized: boolean;
	showToolCalls?: boolean;
	isTyping: boolean;
}) {
	const [isAtBottom, setIsAtBottom] = useState(true);
	const previousShowToolCalls = useRef(showToolCalls);
	// Build grouped render model: pair Tool and Result messages; drop empties
	const buildRenderItems = useMemo(
		() => buildRenderItemsArray(messages),
		[messages]
	);

	const renderItems = showToolCalls
		? buildRenderItems
		: buildRenderItems.filter(
				(item) => (item as { type?: string }).type !== "tool_group"
			);

	const handleScrollUpdate = useCallback((values: unknown) => {
		try {
			const v = values as {
				scrollTop?: number;
				contentScrollHeight?: number;
				clientHeight?: number;
			};
			const scrollTop = Number(v?.scrollTop || 0);
			const contentScrollHeight = Number(v?.contentScrollHeight || 0);
			const clientHeight = Number(v?.clientHeight || 0);
			const distanceFromBottom = Math.max(
				0,
				contentScrollHeight - clientHeight - scrollTop
			);
			setIsAtBottom(distanceFromBottom <= SCROLL_AT_BOTTOM_THRESHOLD);
		} catch {
			// Scroll calculation may fail in some browser contexts
		}
	}, []);

	const scrollToBottom = useCallback(() => {
		try {
			// Prefer scrollbars-custom API when available
			const scroller = (messageListRef.current?.closest(
				".ScrollbarsCustom-Scroller"
			) || null) as HTMLElement | null;
			if (scroller) {
				scroller.scrollTo({ top: scroller.scrollHeight, behavior: "smooth" });
				return;
			}
		} catch {
			// Scroll operation may fail in some browser contexts
		}
		// Fallback to messagesEndRef
		try {
			messagesEndRef.current?.scrollIntoView({
				behavior: "smooth",
				block: "end",
			});
		} catch {
			// Scroll operation may fail in some browser contexts
		}
	}, [messagesEndRef, messageListRef.current]);

	// Preserve scroll position when toggling tool calls visibility
	useEffect(() => {
		if (previousShowToolCalls.current !== showToolCalls) {
			previousShowToolCalls.current = showToolCalls;

			// Capture current scroll position
			try {
				const scroller = (messageListRef.current?.closest(
					".ScrollbarsCustom-Scroller"
				) || null) as HTMLElement | null;

				if (scroller) {
					const savedScrollTop = scroller.scrollTop;
					// Re-render and restore
					requestAnimationFrame(() => {
						scroller.scrollTop = savedScrollTop;
					});
				}
			} catch {
				// Scroll preservation may fail in some contexts
			}
		}
	}, [showToolCalls, messageListRef]);

	return (
		<div className="relative flex-1">
			<GridPattern
				className="absolute inset-0 z-0 text-foreground/11 [mask-image:radial-gradient(75%_60%_at_50%_12%,#000_45%,transparent_100%)]"
				height={36}
				strokeDasharray={"3 3"}
				strokeWidth={0.1}
				width={36}
				x={-1}
				y={-1}
			/>
			<ThemedScrollbar
				className="scrollbar-autohide chat-scrollbar relative z-10 flex-1 bg-transparent"
				noScrollX
				onUpdate={(values) => {
					try {
						// Track top state (existing behavior)
						const scrollTopVal = (values as { scrollTop?: number })?.scrollTop;
						const atTopViaApi =
							typeof scrollTopVal === "number" && scrollTopVal <= 2;
						let atTop = atTopViaApi;
						if (!atTopViaApi) {
							const scroller = (messageListRef.current?.closest(
								".ScrollbarsCustom-Scroller"
							) || null) as HTMLElement | null;
							const container = messageListRef.current as HTMLElement | null;
							if (!container) {
								return;
							}
							atTop = Boolean(scroller ? scroller.scrollTop <= 2 : true);
						}
						const ev = new CustomEvent("chat:scrollTopState", {
							detail: { atTop },
						});
						window.dispatchEvent(ev);
					} catch {
						// Scroll event dispatch may fail in some browser contexts
					}
					// Track bottom state for floating button visibility
					handleScrollUpdate(values);
				}}
				rtl={false}
				style={{ height: "100%" }}
			>
				<div className="message-list px-4 pt-4 pb-2" ref={messageListRef}>
					{messages.length === 0 ? (
						<div className="flex min-h-[12.5rem] items-center justify-center p-4 text-muted-foreground">
							<div className="text-center">
								<MessageSquare className="mx-auto mb-3 h-10 w-10 opacity-50" />
								<p className="text-sm">
									{i18n.getMessage("chat_no_messages", isLocalized)}
								</p>
							</div>
						</div>
					) : (
						renderItems.map((item, idx) => (
							<RenderItemComponent
								idx={idx}
								item={item}
								key={`${(item as { key: string }).key}|${idx}`}
							/>
						))
					)}
					{isTyping && (
						<div className="sticky bottom-0 z-20 bg-gradient-to-t from-card/95 to-card/30 px-4 pt-1 pb-2 backdrop-blur supports-[backdrop-filter]:bg-card/75">
							<article
								aria-live="polite"
								className="relative w-full rounded-lg border border-ring/20 bg-gradient-to-b from-ring/20 to-ring/10 p-2.5"
							>
								<div className="flex items-center gap-2">
									<div
										aria-hidden="true"
										className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-muted-foreground font-medium text-background text-xs"
									>
										<Bot className="h-3.5 w-3.5" />
									</div>
									<div className="min-w-0 flex-1">
										<div className="text-muted-foreground text-sm">
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
					)}
					<div ref={messagesEndRef} />
				</div>
			</ThemedScrollbar>

			{/* Floating scroll-to-bottom button */}
			<AnimatePresence>
				{!isAtBottom && (
					<motion.div
						animate={{ opacity: 1, y: 0, scale: 1 }}
						className="pointer-events-none absolute right-4 bottom-3 z-20"
						exit={{ opacity: 0, y: 8, scale: 0.95 }}
						initial={{ opacity: 0, y: 8, scale: 0.95 }}
						transition={{
							duration: _ANIMATION_DURATION_SHORT,
							ease: _ANIMATION_EASE_CUBIC_ALT,
						}}
					>
						<button
							aria-label={i18n.getMessage("scroll_to_bottom", isLocalized)}
							className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							onClick={scrollToBottom}
							type="button"
						>
							<svg
								aria-hidden="true"
								className="h-4 w-4"
								fill="currentColor"
								viewBox="0 0 24 24"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path d="M12 16a1 1 0 0 1-.707-.293l-6-6a1 1 0 1 1 1.414-1.414L12 13.586l5.293-5.293a1 1 0 0 1 1.414 1.414l-6 6A1 1 0 0 1 12 16Z" />
							</svg>
						</button>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
