'use client'

import { cn } from '@shared/libs/utils'
import { normalizeSimpleFormattingForMarkdown } from '@shared/libs/utils/chat-markdown'
import Youtube from '@tiptap/extension-youtube'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Bot, Clock, MessageSquare, User } from 'lucide-react'
import { marked } from 'marked'
import React, { useEffect } from 'react'
import type { ConversationMessage } from '@/entities/conversation'
import { logger } from '@/shared/libs/logger'
import { formatMessageTimestamp } from '@/shared/libs/utils/date-format'

// Regex patterns for YouTube link processing (moved to module level for performance)
const QUERY_START_REGEX = /^\?/
const NUMERIC_TIME_REGEX = /^\d+$/
const TIME_FORMAT_REGEX = /(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/
const YOUTUBE_SHORT_LINK_REGEX =
	/(?:^|\s)(https?:\/\/(?:www\.)?youtu\.be\/([A-Za-z0-9_-]{11})(\?[^\s]*)?)(?=$|\s)/g
const YOUTUBE_WATCH_LINK_REGEX =
	/(?:^|\s)(https?:\/\/(?:www\.)?youtube\.com\/watch\?([^\s]*?))(?:\s|$)/g

// Constants for time calculation
const SECONDS_PER_HOUR = 3600
const SECONDS_PER_MINUTE = 60
const YOUTUBE_ID_MIN_LENGTH = 11

const logMessageBubbleWarning = (context: string, error: unknown) => {
	logger.warn(`[MessageBubble] ${context}`, error)
}

export const MessageBubble: React.FC<{
	message: ConversationMessage
	isUser: boolean
}> = ({ message, isUser }) => {
	// Hover state removed; timestamps are now inline
	const normalizedMessage = React.useMemo(() => {
		try {
			return normalizeSimpleFormattingForMarkdown(message.message || '')
		} catch {
			return message.message
		}
	}, [message.message])

	const withYoutubeEmbeds = React.useMemo(() => {
		const toEmbedHtml = (id: string, start?: number) => {
			const base = `https://www.youtube-nocookie.com/embed/${id}`
			const params = new URLSearchParams({
				modestbranding: '1',
				rel: '0',
				iv_load_policy: '3',
				controls: '1',
			})
			if (typeof start === 'number' && start > 0) {
				params.set('start', String(start))
			}
			const src = `${base}?${params.toString()}`
			return `<div data-youtube-video><iframe src="${src}" width="640" height="360" allowfullscreen></iframe></div>`
		}

		const getStart = (qs: string): number | undefined => {
			try {
				const params = new URLSearchParams(qs.replace(QUERY_START_REGEX, ''))
				if (params.has('start')) {
					return Number(params.get('start') || 0) || undefined
				}
				if (params.has('t')) {
					const t = String(params.get('t') || '')
					if (NUMERIC_TIME_REGEX.test(t)) {
						return Number(t)
					}
					const m = t.match(TIME_FORMAT_REGEX)
					if (m) {
						const h = Number(m[1] || 0)
						const mm = Number(m[2] || 0)
						const s = Number(m[3] || 0)
						return (
							h * SECONDS_PER_HOUR + mm * SECONDS_PER_MINUTE + s || undefined
						)
					}
				}
			} catch (error) {
				logMessageBubbleWarning('Failed to parse YouTube start time', error)
			}
			return
		}
		const replaceAll = (input: string): string => {
			let out = input
			// youtu.be short links
			out = out.replace(YOUTUBE_SHORT_LINK_REGEX, (_m, _url, id, qs = '') => {
				const start = getStart(String(qs || ''))
				return `\n${toEmbedHtml(String(id), start)}\n`
			})
			// youtube.com/watch links
			out = out.replace(YOUTUBE_WATCH_LINK_REGEX, (_m, _full, qs) => {
				const params = new URLSearchParams(String(qs || ''))
				const id = params.get('v')
				if (!id || id.length < YOUTUBE_ID_MIN_LENGTH) {
					return _m as string
				}
				const start = getStart(String(qs || ''))
				return `\n${toEmbedHtml(String(id), start)}\n`
			})
			// youtube.com/shorts/{id}
			out = out.replace(
				/(?:^|\s)(https?:\/\/(?:www\.)?youtube\.com\/shorts\/([A-Za-z0-9_-]{11})(?:\?[^\s]*)?)(?=$|\s)/g,
				(_m, _u, id) => `\n${toEmbedHtml(String(id))}\n`
			)
			return out
		}
		try {
			return replaceAll(normalizedMessage)
		} catch {
			return normalizedMessage
		}
	}, [normalizedMessage])

	const htmlContent = React.useMemo(() => {
		try {
			return String(marked.parse(withYoutubeEmbeds))
		} catch {
			return withYoutubeEmbeds
		}
	}, [withYoutubeEmbeds])

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
	})

	const normalizedRole = String(message.role || '').toLowerCase()
	let bubbleToneClass = 'border-muted-foreground/20 text-foreground'
	if (isUser) {
		bubbleToneClass = 'border-primary/30 text-primary-foreground'
	} else if (normalizedRole === 'assistant') {
		bubbleToneClass = 'border-muted-foreground/20 text-card-foreground'
	}

	const renderRoleIcon = () => {
		if (message.role === 'user') {
			return <User className="h-3.5 w-3.5" />
		}
		if (message.role === 'secretary') {
			return <MessageSquare className="h-3.5 w-3.5" />
		}
		return <Bot className="h-3.5 w-3.5" />
	}

	useEffect(() => {
		try {
			if (viewer) {
				viewer.commands.setContent(htmlContent)
			}
		} catch (error) {
			logMessageBubbleWarning('Failed to update message viewer content', error)
		}
	}, [htmlContent, viewer])

	return (
		<div className="w-full bg-transparent px-2 py-1">
			<article
				aria-label={`Message from ${message.role}`}
				className={cn('relative w-full rounded-lg border p-3', bubbleToneClass)}
				// Hover effects removed
			>
				<div className="flex items-start gap-2">
					<div
						className={cn(
							'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md font-medium text-xs',
							isUser
								? 'bg-primary text-primary-foreground'
								: 'bg-muted-foreground text-background',
							'avatar-neon'
						)}
					>
						{renderRoleIcon()}
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
	)
}
