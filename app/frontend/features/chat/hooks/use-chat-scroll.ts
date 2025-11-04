'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { ConversationMessage } from '@/entities/conversation'
import { logger } from '@/shared/libs/logger'

type ScrollTarget = {
	waId?: string
	date?: string
	time?: string
	message?: string
}

const CHAT_TIME_STRING_LENGTH = 5
const SCROLL_EVENT_DEBOUNCE_MS = 30
const DOM_UPDATE_SETTLE_DELAY_MS = 50

const logScrollError = (context: string, error: unknown) => {
	logger.warn(`[useChatScroll] ${context}`, error)
}

export function useChatScroll(
	selectedConversationId: string | null,
	sortedMessages: ConversationMessage[],
	options?: { preventAutoScroll?: boolean }
) {
	const messagesEndRef = useRef<HTMLDivElement>(null)
	const messageListRef = useRef<HTMLDivElement>(null)
	const pendingScrollTargetRef = useRef<ScrollTarget | null>(null)
	const lastCountRef = useRef<number>(0)
	const lastScrolledConversationIdRef = useRef<string | null>(null)
	const initialScrollPendingRef = useRef<boolean>(false)
	const preventAutoScroll = options?.preventAutoScroll ?? false

	const tryScrollToTarget = useCallback(() => {
		const target = pendingScrollTargetRef.current
		if (!(target && selectedConversationId)) {
			return
		}
		const waId = String(target.waId || '')
		if (!waId || waId !== String(selectedConversationId)) {
			return
		}
		const targetDate = (target.date || '').toString()
		const targetTime = (target.time || '')
			.toString()
			.slice(0, CHAT_TIME_STRING_LENGTH)
		const targetMsg = (target.message || '').toString().trim()

		let foundIndex = -1
		for (let i = 0; i < sortedMessages.length; i += 1) {
			const m = sortedMessages[i]
			if (!m) {
				continue
			}
			const sameDate = String(m.date || '') === targetDate
			const sameTime =
				String(m.time || '').slice(0, CHAT_TIME_STRING_LENGTH) === targetTime
			if (!(sameDate && sameTime)) {
				continue
			}
			if (targetMsg) {
				const text =
					(m as { message?: string; text?: string }).message ||
					(m as { message?: string; text?: string }).text ||
					''
				if (text && text.indexOf(targetMsg.slice(0, 24)) === -1) {
					continue
				}
			}
			foundIndex = i
			break
		}

		if (foundIndex >= 0) {
			try {
				const el = messageListRef.current?.querySelector(
					`[data-message-index="${foundIndex}"]`
				) as HTMLElement | null
				if (el && typeof el.scrollIntoView === 'function') {
					el.scrollIntoView({ behavior: 'smooth', block: 'center' })
					pendingScrollTargetRef.current = null
					return
				}
			} catch (error) {
				logScrollError('Unable to scroll to target message', error)
			}
		}
	}, [selectedConversationId, sortedMessages])

	// Listen for global requests to scroll to a message
	useEffect(() => {
		const onScrollRequest = (e: Event) => {
			try {
				const { wa_id, date, time, message } = (e as CustomEvent).detail || {}
				pendingScrollTargetRef.current = { waId: wa_id, date, time, message }
				setTimeout(() => tryScrollToTarget(), SCROLL_EVENT_DEBOUNCE_MS)
			} catch (error) {
				logScrollError('Processing scroll request event failed', error)
			}
		}
		window.addEventListener(
			'chat:scrollToMessage',
			onScrollRequest as EventListener
		)
		return () =>
			window.removeEventListener(
				'chat:scrollToMessage',
				onScrollRequest as EventListener
			)
	}, [tryScrollToTarget])

	// On conversation mount/change, check if a target was stashed globally
	useEffect(() => {
		try {
			const w = globalThis as unknown as {
				__chatScrollTarget?: ScrollTarget | null
			}
			const t = w.__chatScrollTarget ?? null
			if (t?.waId && String(t.waId) === String(selectedConversationId)) {
				pendingScrollTargetRef.current = t
				w.__chatScrollTarget = null
				setTimeout(() => tryScrollToTarget(), DOM_UPDATE_SETTLE_DELAY_MS)
			}
		} catch (error) {
			logScrollError('Reading global scroll target failed', error)
		}
	}, [selectedConversationId, tryScrollToTarget])

	// Auto-scroll: on conversation change jump to bottom instantly, then smooth on new messages
	useEffect(() => {
		if (preventAutoScroll) {
			// Update count but skip scrolling
			lastCountRef.current = sortedMessages.length
			return
		}

		const nextCount = sortedMessages.length
		const conversationChanged =
			selectedConversationId !== lastScrolledConversationIdRef.current
		if (conversationChanged) {
			initialScrollPendingRef.current = true
			lastScrolledConversationIdRef.current = selectedConversationId
			lastCountRef.current = nextCount
			setTimeout(() => {
				messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
			}, 0)
			return
		}
		if (nextCount > lastCountRef.current) {
			const behavior = initialScrollPendingRef.current ? 'auto' : 'smooth'
			messagesEndRef.current?.scrollIntoView({ behavior })
			initialScrollPendingRef.current = false
			lastCountRef.current = nextCount
		}
	}, [sortedMessages, selectedConversationId, preventAutoScroll])

	// React to realtime websocket events for the active conversation
	useEffect(() => {
		const handler = (ev: Event) => {
			try {
				const customEvent = ev as CustomEvent
				const detail = customEvent.detail || {}
				if (
					detail?.type === 'conversation_new_message' &&
					detail?.data?.wa_id === selectedConversationId
				) {
					setTimeout(() => {
						messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
					}, DOM_UPDATE_SETTLE_DELAY_MS)
				}
			} catch (error) {
				logScrollError('Processing realtime updates failed', error)
			}
		}
		window.addEventListener('realtime', handler as EventListener)
		return () =>
			window.removeEventListener('realtime', handler as EventListener)
	}, [selectedConversationId])

	return { messageListRef, messagesEndRef, tryScrollToTarget } as const
}
