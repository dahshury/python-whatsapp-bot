"use client";

// Note: type-only React import above; no need to import React runtime here
import { i18n } from "@shared/libs/i18n";
import { cn } from "@shared/libs/utils";
import { normalizeTimeToHHmm } from "@shared/libs/utils/date-format";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, MessageSquare } from "lucide-react";
import * as React from "react";
import type { ConversationMessage } from "@/entities/conversation";
import { LoadingDots } from "@/shared/ui/loading-dots";
import { GridPattern } from "@/shared/ui/magicui/grid-pattern";
import { ThemedScrollbar } from "@/shared/ui/themed-scrollbar";
import { MessageBubble } from "./message-bubble";
import { ToolCallGroup } from "./tool-call-group";

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
	const [atBottom, setAtBottom] = React.useState(true);
	const previousShowToolCalls = React.useRef(showToolCalls);
	// Build grouped render model: pair Tool and Result messages; drop empties
	const buildRenderItems = (items: ConversationMessage[]) => {
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

		const out: Array<GroupItem | MsgItem> = [];

		const extract = (m: ConversationMessage): { kind: "tool" | "result"; name: string; text?: string } | null => {
			try {
				const raw = String((m as { message?: string }).message || "");
				// Prefer HTML summary form
				const sm = raw.match(/<summary>\s*(Tool|Result)\s*:\s*([^<]+)<\/summary>/i);
				if (sm?.[1] && sm?.[2]) {
					const kind = sm[1].toLowerCase() as "tool" | "result";
					const name = String(sm[2] || "").trim();
					const codeMatch = raw.match(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/i);
					const text = codeMatch?.[1];
					return text ? { kind, name, text } : { kind, name };
				}
				// Fallback plaintext
				const pm = raw.match(/^\s*(Tool|Result)\s*:\s*(.*)$/im);
				if (pm?.[1] && pm?.[2]) {
					const kind = pm[1].toLowerCase() as "tool" | "result";
					const name = String(pm[2] || "").trim();
					return { kind, name };
				}
				return null;
			} catch {
				return null;
			}
		};

		for (let i = 0; i < items.length; i++) {
			const m = items[i];
			if (!m) continue;
			const parsed = extract(m);
			const role = String((m as { role?: string }).role || "")
				.trim()
				.toLowerCase();
			if (role === "tool" || parsed) {
				if (parsed && parsed.kind === "tool") {
					const next = items[i + 1];
					const nextParsed = next ? extract(next) : null;
					if (
						nextParsed &&
						nextParsed.kind === "result" &&
						nextParsed.name.toLowerCase() === parsed.name.toLowerCase()
					) {
						// Pair tool args + result
						if (parsed.text || nextParsed.text) {
							out.push({
								type: "tool_group",
								key: `${m.date || ""}|${m.time || ""}|${parsed.name}`,
								name: parsed.name,
								argsText: parsed.text || "",
								resultText: nextParsed.text || "",
								date: m.date || "",
								time: m.time || "",
							});
						}
						i += 1; // consume the result message
						continue;
					}
					// Only tool args present
					if (parsed.text) {
						out.push({
							type: "tool_group",
							key: `${m.date || ""}|${m.time || ""}|${parsed.name}`,
							name: parsed.name,
							argsText: parsed.text || "",
							resultText: "",
							date: m.date || "",
							time: m.time || "",
						});
					}
					// Skip rendering empty-only tool stub
					continue;
				}
				if (parsed && parsed.kind === "result") {
					if (parsed.text) {
						out.push({
							type: "tool_group",
							key: `${m.date || ""}|${m.time || ""}|${parsed.name}`,
							name: parsed.name,
							argsText: "",
							resultText: parsed.text || "",
							date: m.date || "",
							time: m.time || "",
						});
					}
					// Skip empty-only result stub
					continue;
				}
				// If undecidable but role===tool without content, drop it
				continue;
			}
			out.push({ type: "message", message: m });
		}

		return out;
	};

	const renderItems = buildRenderItems(messages);

	// Filter out tool calls if setting is disabled
	const filteredItems = showToolCalls
		? renderItems
		: renderItems.filter((item) => (item as { type?: string }).type !== "tool_group");

	const handleScrollUpdate = React.useCallback(
		(values: unknown) => {
			try {
				const v = values as {
					scrollTop?: number;
					contentScrollHeight?: number;
					clientHeight?: number;
				};
				const scrollTop = Number(v?.scrollTop || 0);
				const contentScrollHeight = Number(v?.contentScrollHeight || 0);
				const clientHeight = Number(v?.clientHeight || 0);
				const distanceFromBottom = Math.max(0, contentScrollHeight - clientHeight - scrollTop);
				setAtBottom(distanceFromBottom <= 8);
			} catch {
				// Fallback to DOM if values missing
				try {
					const scroller = (messageListRef.current?.closest(".ScrollbarsCustom-Scroller") ||
						null) as HTMLElement | null;
					if (!scroller) return;
					const distanceFromBottom = Math.max(0, scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop);
					setAtBottom(distanceFromBottom <= 8);
				} catch {}
			}
		},
		[messageListRef]
	);

	const scrollToBottom = React.useCallback(() => {
		try {
			// Prefer scrollbars-custom API when available
			const scroller = (messageListRef.current?.closest(".ScrollbarsCustom-Scroller") || null) as HTMLElement | null;
			if (scroller) {
				scroller.scrollTo({ top: scroller.scrollHeight, behavior: "smooth" });
				return;
			}
		} catch {}
		// Fallback to messagesEndRef
		try {
			messagesEndRef.current?.scrollIntoView({
				behavior: "smooth",
				block: "end",
			});
		} catch {}
	}, [messageListRef, messagesEndRef]);

	// Preserve scroll position when toggling tool calls visibility
	React.useEffect(() => {
		if (previousShowToolCalls.current !== showToolCalls) {
			previousShowToolCalls.current = showToolCalls;

			// Capture current scroll position
			try {
				const scroller = (messageListRef.current?.closest(".ScrollbarsCustom-Scroller") || null) as HTMLElement | null;

				if (scroller) {
					const wasAtBottom = scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop <= 8;

					// Use requestAnimationFrame to restore position after DOM updates
					requestAnimationFrame(() => {
						if (wasAtBottom) {
							// If user was at bottom, keep them at bottom
							scroller.scrollTop = scroller.scrollHeight - scroller.clientHeight;
						}
						// Otherwise, do nothing - layout animations will handle smooth transitions
					});
				}
			} catch {}
		}
	}, [showToolCalls, messageListRef]);

	return (
		<div className="relative flex-1">
			<GridPattern
				className="absolute inset-0 z-0 text-foreground/11 [mask-image:radial-gradient(75%_60%_at_50%_12%,#000_45%,transparent_100%)]"
				width={36}
				height={36}
				x={-1}
				y={-1}
				strokeDasharray={"3 3"}
				strokeWidth={0.1}
			/>
			<ThemedScrollbar
				className="flex-1 bg-transparent scrollbar-autohide chat-scrollbar relative z-10"
				style={{ height: "100%" }}
				noScrollX
				rtl={false}
				onUpdate={(values) => {
					try {
						// Track top state (existing behavior)
						const scrollTopVal = (values as { scrollTop?: number })?.scrollTop;
						const atTopViaApi = typeof scrollTopVal === "number" && scrollTopVal <= 2;
						let atTop = atTopViaApi;
						if (!atTopViaApi) {
							const scroller = (messageListRef.current?.closest(".ScrollbarsCustom-Scroller") ||
								null) as HTMLElement | null;
							const container = messageListRef.current as HTMLElement | null;
							if (!container) return;
							atTop = Boolean(scroller ? scroller.scrollTop <= 2 : true);
						}
						const ev = new CustomEvent("chat:scrollTopState", {
							detail: { atTop },
						});
						window.dispatchEvent(ev);
					} catch {}
					// Track bottom state for floating button visibility
					handleScrollUpdate(values);
				}}
			>
				<div ref={messageListRef} className="message-list px-4 pt-4 pb-2">
					{messages.length === 0 ? (
						<div className="flex items-center justify-center min-h-[12.5rem] text-muted-foreground p-4">
							<div className="text-center">
								<MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
								<p className="text-sm">{i18n.getMessage("chat_no_messages", isLocalized)}</p>
							</div>
						</div>
					) : (
						filteredItems.map((item, idx) => {
							const isGroup = (item as { type?: string }).type === "tool_group";
							const message = (item as { message?: ConversationMessage }).message;
							const role = message
								? String((message as { role?: string }).role || "")
										.trim()
										.toLowerCase()
								: "tool";

							// Tool groups animate in/out, messages stay static
							if (isGroup) {
								return (
									<AnimatePresence key={`${(item as { key: string }).key}|${idx}`}>
										<motion.div
											className="message-row"
											data-message-index={idx}
											data-role="tool"
											style={{ overflow: "hidden" }}
											initial={{ opacity: 0, height: 0, marginBottom: 0 }}
											animate={{
												opacity: 1,
												height: "auto",
												marginBottom: 8,
											}}
											exit={{ opacity: 0, height: 0, marginBottom: 0 }}
											transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
										>
											<ToolCallGroup
												valueKey={(item as { key: string }).key}
												toolName={(item as { name: string }).name}
												argsText={(item as { argsText: string }).argsText || ""}
												resultText={(item as { resultText: string }).resultText || ""}
											/>
										</motion.div>
									</AnimatePresence>
								);
							}

							// Messages render without animation
							return (
								<div
									key={`${message?.date}|${message?.time}|${role}|${String(message?.message || "").slice(0, 24)}|${idx}`}
									className={cn(
										"message-row",
										role === "user" && "message-row-user",
										role === "admin" && "message-row-admin",
										role === "assistant" && "message-row-assistant",
										role === "secretary" && "message-row-secretary"
									)}
									data-message-index={idx}
									data-message-date={(message as { date?: string } | undefined)?.date || ""}
									data-message-time={normalizeTimeToHHmm((message as { time?: string } | undefined)?.time || "")}
									data-role={role}
								>
									<MessageBubble message={message as ConversationMessage} isUser={role === "user"} />
								</div>
							);
						})
					)}
					{isTyping && (
						<div className="sticky bottom-0 z-20 px-4 pt-1 pb-2 bg-gradient-to-t from-card/95 to-card/30 backdrop-blur supports-[backdrop-filter]:bg-card/75">
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
												<span className="text-xs">{i18n.getMessage("typing", isLocalized)}</span>
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
				{!atBottom && (
					<motion.div
						initial={{ opacity: 0, y: 8, scale: 0.95 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 8, scale: 0.95 }}
						transition={{ duration: 0.16, ease: [0.45, 0, 0.55, 1] }}
						className="pointer-events-none absolute bottom-3 right-4 z-20"
					>
						<button
							type="button"
							onClick={scrollToBottom}
							className="pointer-events-auto inline-flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							aria-label={i18n.getMessage("scroll_to_bottom", isLocalized)}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								fill="currentColor"
								className="h-4 w-4"
								aria-hidden="true"
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
