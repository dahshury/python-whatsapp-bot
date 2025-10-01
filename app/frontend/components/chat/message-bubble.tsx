"use client";

import Youtube from "@tiptap/extension-youtube";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bot, Clock, MessageSquare, User } from "lucide-react";
import { marked } from "marked";
import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { normalizeSimpleFormattingForMarkdown } from "@/lib/utils/chat-markdown";
import { formatMessageTimestamp } from "@/lib/utils/date-format";
import type { ConversationMessage } from "@/types/conversation";

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

	const withYoutubeEmbeds = React.useMemo(() => {
		const toEmbedHtml = (id: string, start?: number) => {
			const base = `https://www.youtube-nocookie.com/embed/${id}`;
			const params = new URLSearchParams({
				modestbranding: "1",
				rel: "0",
				iv_load_policy: "3",
				controls: "1",
			});
			if (typeof start === "number" && start > 0)
				params.set("start", String(start));
			const src = `${base}?${params.toString()}`;
			return `<div data-youtube-video><iframe src="${src}" width="640" height="360" allowfullscreen></iframe></div>`;
		};
		const getStart = (qs: string): number | undefined => {
			try {
				const params = new URLSearchParams(qs.replace(/^\?/, ""));
				if (params.has("start"))
					return Number(params.get("start") || 0) || undefined;
				if (params.has("t")) {
					const t = String(params.get("t") || "");
					if (/^\d+$/.test(t)) return Number(t);
					const m = t.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/);
					if (m) {
						const h = Number(m[1] || 0);
						const mm = Number(m[2] || 0);
						const s = Number(m[3] || 0);
						return h * 3600 + mm * 60 + s || undefined;
					}
				}
			} catch {}
			return undefined;
		};
		const replaceAll = (input: string): string => {
			let out = input;
			// youtu.be short links
			out = out.replace(
				/(?:^|\s)(https?:\/\/(?:www\.)?youtu\.be\/([A-Za-z0-9_-]{11})(\?[^\s]*)?)(?=$|\s)/g,
				(_m, _url, id, qs = "") => {
					const start = getStart(String(qs || ""));
					return `\n${toEmbedHtml(String(id), start)}\n`;
				},
			);
			// youtube.com/watch links
			out = out.replace(
				/(?:^|\s)(https?:\/\/(?:www\.)?youtube\.com\/watch\?([^\s]*?))(?:\s|$)/g,
				(_m, _full, qs) => {
					const params = new URLSearchParams(String(qs || ""));
					const id = params.get("v");
					if (!id || id.length < 11) return _m as string;
					const start = getStart(String(qs || ""));
					return `\n${toEmbedHtml(String(id), start)}\n`;
				},
			);
			// youtube.com/shorts/{id}
			out = out.replace(
				/(?:^|\s)(https?:\/\/(?:www\.)?youtube\.com\/shorts\/([A-Za-z0-9_-]{11})(?:\?[^\s]*)?)(?=$|\s)/g,
				(_m, _u, id) => {
					return `\n${toEmbedHtml(String(id))}\n`;
				},
			);
			return out;
		};
		try {
			return replaceAll(normalizedMessage);
		} catch {
			return normalizedMessage;
		}
	}, [normalizedMessage]);

	const htmlContent = React.useMemo(() => {
		try {
			return String(marked.parse(withYoutubeEmbeds));
		} catch {
			return withYoutubeEmbeds;
		}
	}, [withYoutubeEmbeds]);

	const viewer = useEditor({
		editable: false,
		immediatelyRender: true,
		extensions: [
			StarterKit,
			Youtube.configure({
				inline: false,
				width: 640,
				height: 360,
				nocookie: true,
				controls: true,
				allowFullscreen: true,
			}),
		],
		content: htmlContent,
	});

	useEffect(() => {
		try {
			if (viewer) {
				viewer.commands.setContent(htmlContent);
			}
		} catch {}
	}, [htmlContent, viewer]);

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
						<div className="tiptap text-sm break-words whitespace-pre-wrap overflow-x-hidden">
							<EditorContent editor={viewer} />
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
