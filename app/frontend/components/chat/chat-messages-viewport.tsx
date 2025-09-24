"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MessageSquare } from "lucide-react";
import type * as React from "react";
import { GridPattern } from "@/components/magicui/grid-pattern";
import { ThemedScrollbar } from "@/components/themed-scrollbar";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { normalizeTimeToHHmm } from "@/lib/utils/date-format";
import type { ConversationMessage } from "@/types/calendar";
import { MessageBubble } from "./message-bubble";

export function ChatMessagesViewport({
	messages,
	messageListRef,
	messagesEndRef,
	isLocalized,
}: {
	messages: ConversationMessage[];
	messageListRef: React.RefObject<HTMLDivElement>;
	messagesEndRef: React.RefObject<HTMLDivElement>;
	isLocalized: boolean;
}) {
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
							{messages.map((message, idx) => (
								<motion.div
									key={`${message.date}|${message.time}|${message.role}|${(message.message || "").slice(0, 24)}|${idx}`}
									className={cn(
										"message-row",
										message.role === "user" && "message-row-user",
										message.role === "admin" && "message-row-admin",
										message.role === "assistant" && "message-row-assistant",
										message.role === "secretary" && "message-row-secretary",
									)}
									data-message-index={idx}
									data-message-date={(message as { date?: string }).date || ""}
									data-message-time={normalizeTimeToHHmm(
										(message as { time?: string }).time || "",
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
	);
}
