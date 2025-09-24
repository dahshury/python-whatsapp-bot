"use client";

import { Bot, Clock, MessageSquare, User } from "lucide-react";
import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { normalizeSimpleFormattingForMarkdown } from "@/lib/utils/chat-markdown";
import { formatMessageTimestamp } from "@/lib/utils/date-format";
import type { ConversationMessage } from "@/types/calendar";

export const MessageBubble: React.FC<{
	message: ConversationMessage;
	isUser: boolean;
}> = ({ message, isUser }) => {
	const [isHovered, setIsHovered] = useState(false);
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
					<div
						className={cn(
							"flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-xs font-medium",
							isUser
								? "bg-primary text-primary-foreground"
								: "bg-muted-foreground text-background",
							"avatar-neon",
						)}
					>
						{message.role === "user" ? (
							<User className="h-3.5 w-3.5" />
						) : message.role === "secretary" ? (
							<MessageSquare className="h-3.5 w-3.5" />
						) : (
							<Bot className="h-3.5 w-3.5" />
						)}
					</div>

					<div className="flex-1 min-w-0">
						<div className="text-sm prose prose-sm max-w-none prose-p:my-0.5 prose-headings:mt-1.5 prose-headings:mb-0.5 prose-ul:my-0.5 prose-ol:my-0.5 prose-li:my-0 prose-pre:my-0.5 prose-code:text-xs break-words whitespace-pre-wrap overflow-x-hidden prose-a:[overflow-wrap:anywhere] prose-pre:overflow-x-auto">
							<ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
								{normalizedMessage}
							</ReactMarkdown>
						</div>
					</div>
				</div>

				<div
					className={cn(
						"absolute bottom-2 right-3 flex items-center gap-1 text-[0.625rem] transition-colors",
						isHovered ? "text-muted-foreground/80" : "text-muted-foreground/50",
					)}
				>
					<Clock className="h-2.5 w-2.5" />
					<span>{formatMessageTimestamp(message.date, message.time)}</span>
				</div>
			</article>
		</div>
	);
};
