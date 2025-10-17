"use client";

import { cn } from "@shared/libs/utils";
import { normalizeSimpleFormattingForMarkdown } from "@shared/libs/utils/chat-markdown";
import Youtube from "@tiptap/extension-youtube";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bot, Clock, MessageSquare, User } from "lucide-react";
import { marked } from "marked";
import type React from "react";
import { useCallback, useEffect, useMemo } from "react";
import type { ConversationMessage } from "@/entities/conversation";
import { formatMessageTimestamp } from "@/shared/libs/utils/date-format";

// YouTube URL patterns
const YOUTU_BE_PATTERN =
	/(?:^|\s)(https?:\/\/(?:www\.)?youtu\.be\/([A-Za-z0-9_-]{11})(\?[^\s]*)?)(?=$|\s)/g;
const YOUTUBE_WATCH_PATTERN =
	/(?:^|\s)(https?:\/\/(?:www\.)?youtube\.com\/watch\?([^\s]*?))(?:\s|$)/g;
const YOUTUBE_SHORTS_PATTERN =
	/(?:^|\s)(https?:\/\/(?:www\.)?youtube\.com\/shorts\/([A-Za-z0-9_-]{11})(?:\?[^\s]*)?)(?=$|\s)/g;
const START_ONLY_PATTERN = /^\d+$/;
const TIME_FORMAT_PATTERN = /(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/;
const QUERY_STRING_PREFIX = "?";
const HOURS_TO_SECONDS = 3600;
const MINUTES_TO_SECONDS = 60;
const VIDEO_WIDTH = 640;
const VIDEO_HEIGHT = 315;

// Helper to parse YouTube time parameter (e.g., "1h2m30s" or "90")
function parseYouTubeTimeParam(t: string): number | undefined {
	if (START_ONLY_PATTERN.test(t)) {
		return Number(t) || undefined;
	}

	const m = t.match(TIME_FORMAT_PATTERN);
	if (!m) {
		return;
	}

	const h = Number(m[1] || 0);
	const mm = Number(m[2] || 0);
	const s = Number(m[3] || 0);
	return h * HOURS_TO_SECONDS + mm * MINUTES_TO_SECONDS + s || undefined;
}

// Video player dimensions
const MIN_VIDEO_ID_LENGTH = 11;

export const MessageBubble: React.FC<{
	message: ConversationMessage;
	isUser: boolean;
}> = ({ message, isUser }) => {
	// Hover state removed; timestamps are now inline
	const normalizedMessage = useMemo(() => {
		try {
			return normalizeSimpleFormattingForMarkdown(message.message || "");
		} catch {
			return message.message;
		}
	}, [message.message]);

	// Extract YouTube start time from query string
	const extractYouTubeStartTime = useCallback(
		(qs: string): number | undefined => {
			try {
				const params = new URLSearchParams(qs.replace(QUERY_STRING_PREFIX, ""));
				if (params.has("start")) {
					return Number(params.get("start") || 0) || undefined;
				}
				const t = String(params.get("t") || "");
				if (!t) {
					return;
				}
				return parseYouTubeTimeParam(t);
			} catch {
				return;
			}
		},
		[]
	);

	// Generate YouTube embed HTML
	const toEmbedHtml = useCallback((id: string, start?: number) => {
		const base = `https://www.youtube-nocookie.com/embed/${id}`;
		const params = new URLSearchParams({
			modestbranding: "1",
			rel: "0",
			iv_load_policy: "3",
			controls: "1",
		});
		if (typeof start === "number" && start > 0) {
			params.set("start", String(start));
		}
		const src = `${base}?${params.toString()}`;
		return `<div data-youtube-video><iframe src="${src}" width="${VIDEO_WIDTH}" height="${VIDEO_HEIGHT}" title="YouTube video player" allowfullscreen></iframe></div>`;
	}, []);

	const withYoutubeEmbeds = useMemo(() => {
		const replaceAll = (input: string): string => {
			let out = input;

			// youtu.be short links
			out = out.replace(YOUTU_BE_PATTERN, (_m, _url, id, qs = "") => {
				const start = extractYouTubeStartTime(String(qs || ""));
				return `\n${toEmbedHtml(String(id), start)}\n`;
			});

			// youtube.com/watch links
			out = out.replace(YOUTUBE_WATCH_PATTERN, (_m, _full, qs) => {
				const params = new URLSearchParams(String(qs || ""));
				const id = params.get("v");
				if (!id || id.length < MIN_VIDEO_ID_LENGTH) {
					return _m as string;
				}
				const start = extractYouTubeStartTime(String(qs || ""));
				return `\n${toEmbedHtml(String(id), start)}\n`;
			});

			// youtube.com/shorts/{id}
			out = out.replace(
				YOUTUBE_SHORTS_PATTERN,
				(_m, _u, id) => `\n${toEmbedHtml(String(id))}\n`
			);

			return out;
		};

		try {
			return replaceAll(normalizedMessage);
		} catch {
			return normalizedMessage;
		}
	}, [normalizedMessage, extractYouTubeStartTime, toEmbedHtml]);

	const htmlContent = useMemo(() => {
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
				width: VIDEO_WIDTH,
				height: VIDEO_HEIGHT,
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
		} catch {
			// Editor state update may fail in some contexts
		}
	}, [htmlContent, viewer]);

	const getMessageBorderClass = (): string => {
		if (isUser) {
			return "border-primary/30 text-primary-foreground";
		}
		if (String(message.role || "").toLowerCase() === "assistant") {
			return "border-muted-foreground/20 text-card-foreground";
		}
		return "border-muted-foreground/20 text-foreground";
	};

	const getRoleIcon = (): React.ReactNode => {
		if (message.role === "user") {
			return <User className="h-3.5 w-3.5" />;
		}
		if (message.role === "secretary") {
			return <MessageSquare className="h-3.5 w-3.5" />;
		}
		return <Bot className="h-3.5 w-3.5" />;
	};

	return (
		<div className="w-full bg-transparent px-2 py-1">
			<article
				aria-label={`Message from ${message.role}`}
				className={cn(
					"relative w-full rounded-lg border p-3",
					getMessageBorderClass()
				)}
				// Hover effects removed
			>
				<div className="flex items-start gap-2">
					<div
						className={cn(
							"flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md font-medium text-xs",
							isUser
								? "bg-primary text-primary-foreground"
								: "bg-muted-foreground text-background",
							"avatar-neon"
						)}
					>
						{getRoleIcon()}
					</div>

					<div className="min-w-0 flex-1">
						<div className="tiptap overflow-x-hidden whitespace-pre-wrap break-words text-sm">
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
