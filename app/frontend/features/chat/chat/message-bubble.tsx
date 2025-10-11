"use client";

import { cn } from "@shared/libs/utils";
import { normalizeSimpleFormattingForMarkdown } from "@shared/libs/utils/chat-markdown";
import Youtube from "@tiptap/extension-youtube";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bot, Clock, MessageSquare, User } from "lucide-react";
import { marked } from "marked";
import React, { useEffect } from "react";
import type { ConversationMessage } from "@/entities/conversation";
import { formatMessageTimestamp } from "@/shared/libs/utils/date-format";

export const MessageBubble: React.FC<{
	message: ConversationMessage;
	isUser: boolean;
}> = ({ message, isUser }) => {
	// Hover state removed; timestamps are now inline
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
			if (typeof start === "number" && start > 0) params.set("start", String(start));
			const src = `${base}?${params.toString()}`;
			return `<div data-youtube-video><iframe src="${src}" width="640" height="360" allowfullscreen></iframe></div>`;
		};
		const getStart = (qs: string): number | undefined => {
			try {
				const params = new URLSearchParams(qs.replace(/^\?/, ""));
				if (params.has("start")) return Number(params.get("start") || 0) || undefined;
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
				}
			);
			// youtube.com/watch links
			out = out.replace(/(?:^|\s)(https?:\/\/(?:www\.)?youtube\.com\/watch\?([^\s]*?))(?:\s|$)/g, (_m, _full, qs) => {
				const params = new URLSearchParams(String(qs || ""));
				const id = params.get("v");
				if (!id || id.length < 11) return _m as string;
				const start = getStart(String(qs || ""));
				return `\n${toEmbedHtml(String(id), start)}\n`;
			});
			// youtube.com/shorts/{id}
			out = out.replace(
				/(?:^|\s)(https?:\/\/(?:www\.)?youtube\.com\/shorts\/([A-Za-z0-9_-]{11})(?:\?[^\s]*)?)(?=$|\s)/g,
				(_m, _u, id) => {
					return `\n${toEmbedHtml(String(id))}\n`;
				}
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
					"rounded-lg p-3 w-full relative border",
					isUser
						? "text-primary-foreground border-primary/30"
						: String(message.role || "").toLowerCase() === "assistant"
							? "text-card-foreground border-muted-foreground/20"
							: "text-foreground border-muted-foreground/20"
				)}
				// Hover effects removed
			>
				<div className="flex gap-2 items-start">
					<div
						className={cn(
							"flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-xs font-medium",
							isUser ? "bg-primary text-primary-foreground" : "bg-muted-foreground text-background",
							"avatar-neon"
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
				<div className="mt-2 flex items-center justify-end gap-1 text-[0.625rem] opacity-80">
					<Clock className="h-2.5 w-2.5" />
					<span>{formatMessageTimestamp(message.date, message.time)}</span>
				</div>
			</article>
		</div>
	);
};
