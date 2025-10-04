"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MessageSquare } from "lucide-react";
import type * as React from "react";
import { GridPattern } from "@/components/magicui/grid-pattern";
import { ThemedScrollbar } from "@/components/themed-scrollbar";
// Note: type-only React import above; no need to import React runtime here
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { normalizeTimeToHHmm } from "@/lib/utils/date-format";
import type { ConversationMessage } from "@/types/conversation";
import { MessageBubble } from "./message-bubble";
import { ToolCallGroup } from "./tool-call-group";

export function ChatMessagesViewport({
	messages,
	messageListRef,
	messagesEndRef,
	isLocalized,
	showToolCalls = true,
}: {
	messages: ConversationMessage[];
	messageListRef: React.RefObject<HTMLDivElement>;
	messagesEndRef: React.RefObject<HTMLDivElement>;
	isLocalized: boolean;
	showToolCalls?: boolean;
}) {
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

		const extract = (
			m: ConversationMessage,
		): { kind: "tool" | "result"; name: string; text?: string } | null => {
			try {
				const raw = String((m as { message?: string }).message || "");
				// Prefer HTML summary form
				const sm = raw.match(
					/<summary>\s*(Tool|Result)\s*:\s*([^<]+)<\/summary>/i,
				);
				if (sm?.[1] && sm?.[2]) {
					const kind = sm[1].toLowerCase() as "tool" | "result";
					const name = String(sm[2] || "").trim();
					const codeMatch = raw.match(
						/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/i,
					);
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
		: renderItems.filter(
				(item) => (item as { type?: string }).type !== "tool_group",
			);

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
						// Prefer scrollbars-custom API when available
						const scrollTopVal = (values as { scrollTop?: number })?.scrollTop;
						const atTopViaApi =
							typeof scrollTopVal === "number" && scrollTopVal <= 2;
						let atTop = atTopViaApi;
						if (!atTopViaApi) {
							// Fallback to DOM
							const scroller = (messageListRef.current?.closest(
								".ScrollbarsCustom-Scroller",
							) || null) as HTMLElement | null;
							const container = messageListRef.current as HTMLElement | null;
							if (!container) return;
							atTop = Boolean(scroller ? scroller.scrollTop <= 2 : true);
						}
						const ev = new CustomEvent("chat:scrollTopState", {
							detail: { atTop },
						});
						window.dispatchEvent(ev);
					} catch {}
				}}
			>
				<div ref={messageListRef} className="message-list px-4 pt-4 pb-2">
					{messages.length === 0 ? (
						<div className="flex items-center justify-center min-h-[12.5rem] text-muted-foreground p-4">
							<div className="text-center">
								<MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
								<p className="text-sm">
									{i18n.getMessage("chat_no_messages", isLocalized)}
								</p>
							</div>
						</div>
					) : (
						<AnimatePresence initial={false}>
							{filteredItems.map((item, idx) => {
								const isGroup =
									(item as { type?: string }).type === "tool_group";
								const message = (item as { message?: ConversationMessage })
									.message;
								const role = message
									? String((message as { role?: string }).role || "")
											.trim()
											.toLowerCase()
									: "tool";
								return (
									<motion.div
										key={
											isGroup
												? `${(item as { key: string }).key}|${idx}`
												: `${message?.date}|${message?.time}|${role}|${String(message?.message || "").slice(0, 24)}|${idx}`
										}
										className={cn(
											"message-row",
											role === "user" && "message-row-user",
											role === "admin" && "message-row-admin",
											role === "assistant" && "message-row-assistant",
											role === "secretary" && "message-row-secretary",
										)}
										data-message-index={idx}
										data-message-date={
											(message as { date?: string } | undefined)?.date || ""
										}
										data-message-time={normalizeTimeToHHmm(
											(message as { time?: string } | undefined)?.time || "",
										)}
										data-role={role}
										initial={{ opacity: 0, y: 8 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: -8 }}
										transition={{ duration: 0.18, ease: "easeOut" }}
									>
										{isGroup ? (
											<ToolCallGroup
												valueKey={(item as { key: string }).key}
												toolName={(item as { name: string }).name}
												argsText={(item as { argsText: string }).argsText || ""}
												resultText={
													(item as { resultText: string }).resultText || ""
												}
											/>
										) : (
											<MessageBubble
												message={message as ConversationMessage}
												isUser={role === "user"}
											/>
										)}
									</motion.div>
								);
							})}
						</AnimatePresence>
					)}
					<div ref={messagesEndRef} />
				</div>
			</ThemedScrollbar>
		</div>
	);
}
