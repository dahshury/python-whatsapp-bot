'use client'
// Replaced Textarea with TipTap's EditorContent for live formatting
import { i18n } from '@shared/libs/i18n'
import { useLanguage } from '@shared/libs/state/language-context'
import { useSettings } from '@shared/libs/state/settings-context'
import { useSidebarChatStore } from '@shared/libs/store/sidebar-chat-store'
import { toastService } from '@shared/libs/toast'
import { cn } from '@shared/libs/utils'
import { Button } from '@ui/button'
import { ChevronUp, MessageSquare } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
// Reservation type no longer needed here after switching to provider hooks
import type { ConversationMessage } from '@/entities/conversation'
import {
	useChatScroll,
	useConversationActivity,
	useSendMessage,
} from '@/features/chat'
import { BasicChatInput } from '@/features/chat/chat/basic-chat-input'
import { ChatMessagesViewport } from '@/features/chat/chat/chat-messages-viewport'
import { logger } from '@/shared/libs/logger'
import { Spinner } from '@/shared/ui/spinner'
import {
	useConversationMessagesQuery,
	useCustomerNames,
	useTypingIndicator,
} from './hooks'

type ChatSidebarContentProps = {
	selectedConversationId: string | null
	onConversationSelect: (conversationId: string) => void
	onRefresh?: () => void
	className?: string
}

const TIME_FORMAT_REGEX = /^\d{2}:\d{2}(?::\d{2})?$/
const TIME_WITHOUT_SECONDS_LENGTH = 5
const LOAD_MORE_RESET_DELAY_MS = 100
const TYPING_THROTTLE_MS = 8000

const logSidebarWarning = (context: string, error: unknown) => {
	logger.warn(`[ChatSidebar] ${context}`, error)
}

// message bubble moved to components/chat/message-bubble

export const ChatSidebarContent: React.FC<ChatSidebarContentProps> = ({
	selectedConversationId,
	onRefresh: _onRefresh,
	className,
}) => {
	const { isLocalized } = useLanguage()
	const { showToolCalls, chatMessageLimit, sendTypingIndicator } = useSettings()
	const { isLoadingConversation, setLoadingConversation } =
		useSidebarChatStore()

	// Fetch conversation messages on-demand using TanStack Query
	const {
		data: conversationMessages = [],
		isLoading: isLoadingConversationMessages,
	} = useConversationMessagesQuery(selectedConversationId)

	// Update loading state based on TanStack Query
	useEffect(() => {
		if (!selectedConversationId) {
			setLoadingConversation(false)
			return
		}

		// Clear loading when messages are loaded
		if (!isLoadingConversationMessages && conversationMessages.length >= 0) {
			setLoadingConversation(false)
		}
	}, [
		selectedConversationId,
		isLoadingConversationMessages,
		conversationMessages.length,
		setLoadingConversation,
	])
	const { sendMessage } = useSendMessage(selectedConversationId || '')
	const [isSending, setIsSending] = useState(false)
	const [loadedMessageCount, setLoadedMessageCount] =
		useState<number>(chatMessageLimit)
	const [isLoadingMore, setIsLoadingMore] = useState(false)
	const [isAtTop, setIsAtTop] = useState(false)
	const [isTyping, setIsTyping] = useState(false)
	// scrolling refs managed by useChatScroll below

	// Local state for additional messages (not optimistic - only added on success)
	const [additionalMessages, setAdditionalMessages] = useState<
		Record<string, ConversationMessage[]>
	>({})

	// Combine fetched messages with additional messages for this conversation
	const conversationAdditional = selectedConversationId
		? additionalMessages[selectedConversationId] || []
		: []
	const allMessages = [
		...conversationMessages,
		...conversationAdditional,
	] as ConversationMessage[]

	// Sort messages by robust ISO datetime parsing
	const getMessageTimestamp = (m: ConversationMessage): number => {
		try {
			const date = String((m as { date?: string }).date || '')
			const timeRaw = String((m as { time?: string }).time || '')
			if (!date) {
				return 0
			}
			let t = timeRaw
			if (t && TIME_FORMAT_REGEX.test(t)) {
				if (t.length === TIME_WITHOUT_SECONDS_LENGTH) {
					t = `${t}:00`
				}
				const d = new Date(`${date}T${t}`)
				return Number.isNaN(d.getTime()) ? 0 : d.getTime()
			}
			const d = new Date(`${date}T00:00:00`)
			return Number.isNaN(d.getTime()) ? 0 : d.getTime()
		} catch {
			return 0
		}
	}

	const sortedMessages = [...allMessages].sort(
		(a, b) => getMessageTimestamp(a) - getMessageTimestamp(b)
	) as ConversationMessage[]

	// Apply message limit (show last N messages)
	const limitedMessages = useMemo(
		() => sortedMessages.slice(-loadedMessageCount),
		[sortedMessages, loadedMessageCount]
	)

	const hasMoreMessages = sortedMessages.length > limitedMessages.length

	const handleLoadMore = useCallback(() => {
		setIsLoadingMore(true)
		// Use RAF to ensure state updates before scroll calculation
		requestAnimationFrame(() => {
			setLoadedMessageCount((prev) => prev + chatMessageLimit)
			// Reset loading flag after a brief delay
			setTimeout(() => setIsLoadingMore(false), LOAD_MORE_RESET_DELAY_MS)
		})
	}, [chatMessageLimit])

	// Reset loaded count when conversation changes
	useEffect(() => {
		setLoadedMessageCount(chatMessageLimit)
	}, [chatMessageLimit])

	// Scrolling handled by dedicated hook
	const { messageListRef, messagesEndRef } = useChatScroll(
		selectedConversationId,
		limitedMessages,
		{
			preventAutoScroll: isLoadingMore,
		}
	)

	// Listen for top-of-scroll state emitted by viewport
	useEffect(() => {
		const handler = (e: Event) => {
			try {
				const { atTop } = (e as CustomEvent).detail || {}
				if (typeof atTop === 'boolean') {
					setIsAtTop(atTop)
				}
			} catch (error) {
				logSidebarWarning('scrollTopState event handler failed', error)
			}
		}
		window.addEventListener('chat:scrollTopState', handler as EventListener)
		return () =>
			window.removeEventListener(
				'chat:scrollTopState',
				handler as EventListener
			)
	}, [])

	// Clear additional messages when conversation changes
	useEffect(() => {
		setAdditionalMessages({})
	}, [])

	// Listen for typing indicator events for the selected conversation
	useEffect(() => {
		const handler = (ev: Event) => {
			try {
				const { wa_id, typing } = (ev as CustomEvent).detail || {}
				if (!selectedConversationId) {
					return
				}
				if (String(wa_id) === String(selectedConversationId)) {
					setIsTyping(Boolean(typing))
				}
			} catch (error) {
				logSidebarWarning('typing indicator event handler failed', error)
			}
		}
		window.addEventListener('chat:typing', handler as EventListener)
		return () =>
			window.removeEventListener('chat:typing', handler as EventListener)
	}, [selectedConversationId])

	// Auto scroll and realtime handled by useChatScroll

	// Send message function - called by BasicChatInput
	const handleSendMessage = async (messageText: string) => {
		if (!selectedConversationId || isSending) {
			return
		}

		setIsSending(true)

		try {
			await sendMessage(messageText)

			// Do not append locally; rely on backend broadcast to update conversations
		} catch (error) {
			// Log detailed error for debugging
			logger.error('[ChatSidebar] Failed to send message', {
				error,
				conversationId: selectedConversationId,
				messageLength: messageText?.length,
			})

			// Show detailed error message to user
			const errorDetails =
				error instanceof Error ? error.message : String(error)
			const errorMessage = `${i18n.getMessage('chat_message_failed', isLocalized)}: ${errorDetails}`
			toastService.error(errorMessage)
		} finally {
			setIsSending(false)
		}
	}

	// Simple input state - no complex calculations
	const hasConversationSelected = !!selectedConversationId
	// Inactivity: last USER message > 24 hours ago
	const isInactive = useConversationActivity(limitedMessages)
	const inputPlaceholder = hasConversationSelected
		? i18n.getMessage('chat_type_message', isLocalized)
		: i18n.getMessage('chat_no_conversation', isLocalized)

	// Emit typing indicator via TanStack Query mutation (throttled) when enabled
	const typingMutation = useTypingIndicator()
	useEffect(() => {
		if (!(sendTypingIndicator && selectedConversationId)) {
			return
		}
		// Throttled typing indicator via HTTP endpoint using TanStack Query
		let lastSent = 0
		const dispatchTyping = (value: boolean) => {
			try {
				const now = Date.now()
				if (now - lastSent >= TYPING_THROTTLE_MS) {
					typingMutation.mutate(
						{
							wa_id: selectedConversationId,
							typing: value,
						},
						{
							onError: (error) =>
								logSidebarWarning('Failed to dispatch typing indicator', error),
						}
					)
					lastSent = now
				}
			} catch (error) {
				logSidebarWarning('Editor typing throttler failed', error)
			}
		}
		const onEditorTyping = () => {
			dispatchTyping(true)
		}
		const handler = (e: Event) => {
			try {
				const eventType = (e as CustomEvent).detail?.type
				if (eventType === 'chat:editor_update') {
					onEditorTyping()
				}
			} catch (error) {
				logSidebarWarning('Editor event listener failed', error)
			}
		}
		window.addEventListener('chat:editor_event', handler as EventListener)
		return () => {
			dispatchTyping(false)
			window.removeEventListener('chat:editor_event', handler as EventListener)
		}
	}, [sendTypingIndicator, selectedConversationId, typingMutation])

	// Show combobox - always show it since we're loading customer names
	const { data: customerNames } = useCustomerNames()
	const shouldShowCombobox = Boolean(customerNames)

	if (!selectedConversationId) {
		return (
			<div className={cn('relative flex h-full flex-col bg-card', className)}>
				{/* Loading overlay with blur effect */}
				{isLoadingConversation && (
					<div className="chat-loading-overlay absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
						<div className="flex flex-col items-center gap-2">
							<Spinner className="size-6 text-primary" />
							<p className="text-muted-foreground text-sm">
								{i18n.getMessage('chat_loading_conversation', isLocalized)}
							</p>
						</div>
					</div>
				)}

				{/* Empty State */}
				<div className="flex flex-1 items-center justify-center p-4 text-muted-foreground">
					<div className="text-center">
						<MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
						<p className="text-sm">
							{shouldShowCombobox
								? i18n.getMessage('chat_select_conversation', isLocalized)
								: i18n.getMessage('chat_no_conversations', isLocalized)}
						</p>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className={cn('relative flex h-full flex-col bg-card', className)}>
			{/* Loading overlay with blur effect */}
			{(isLoadingConversation || isLoadingConversationMessages) && (
				<div className="chat-loading-overlay absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
					<div className="flex flex-col items-center gap-2">
						<Spinner className="size-6 text-primary" />
						<p className="text-muted-foreground text-sm">
							{i18n.getMessage('chat_loading_conversation', isLocalized)}
						</p>
					</div>
				</div>
			)}

			{/* Messages Area */}
			<div className="relative flex flex-1 flex-col">
				<ChatMessagesViewport
					isLocalized={isLocalized}
					isTyping={isTyping}
					loadMoreButton={
						hasMoreMessages && isAtTop ? (
							<div className="sticky top-0 z-10 flex justify-center bg-gradient-to-b from-card to-transparent p-2">
								<Button
									className="h-7 text-xs shadow-md"
									onClick={handleLoadMore}
									size="sm"
									variant="outline"
								>
									<ChevronUp className="mr-1 h-3 w-3" />
									{i18n.getMessage('load_more', isLocalized)}
									<span className="ml-1.5 opacity-70">
										(+{chatMessageLimit})
									</span>
								</Button>
							</div>
						) : null
					}
					messageListRef={
						messageListRef as unknown as React.RefObject<HTMLDivElement>
					}
					messages={limitedMessages}
					messagesEndRef={
						messagesEndRef as unknown as React.RefObject<HTMLDivElement>
					}
					showToolCalls={showToolCalls}
				/>
			</div>
			{/* Message Input - Sticky to bottom with background */}
			{/* Message Input - Sticky to bottom with background */}
			<div
				className="sticky bottom-0 border-sidebar-border border-t p-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]"
				style={{
					backgroundColor: 'hsl(var(--card))',
					background: 'hsl(var(--card))',
					backdropFilter: 'none',
					zIndex: 'var(--z-chat-footer)',
				}}
			>
				<BasicChatInput
					disabled={!hasConversationSelected || isSending}
					inactiveText={
						limitedMessages.length === 0
							? i18n.getMessage(
									'chat_cannot_message_no_conversation',
									isLocalized
								)
							: i18n.getMessage('chat_messaging_unavailable', isLocalized)
					}
					isInactive={isInactive}
					isLocalized={isLocalized}
					isSending={isSending}
					onSend={handleSendMessage}
					placeholder={inputPlaceholder}
				/>
			</div>
		</div>
	)
}
