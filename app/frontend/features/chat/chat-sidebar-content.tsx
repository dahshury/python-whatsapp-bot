'use client'
import { i18n } from '@shared/libs/i18n'
import { useSidebarChatStore } from '@shared/libs/store/sidebar-chat-store'
import { toastService } from '@shared/libs/toast'
import { cn } from '@shared/libs/utils'
// Replaced Textarea with TipTap's EditorContent for live formatting
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@ui/button'
import {
	AlertTriangle,
	Ban,
	Bot,
	ChevronUp,
	MessageSquare,
	MoreHorizontal,
	Star,
	Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
// Reservation type no longer needed here after switching to provider hooks
import type { ConversationMessage } from '@/entities/conversation'
import {
	useChatScroll,
	useConversationActivity,
	useSendMessage,
} from '@/features/chat'
import { BasicChatInput } from '@/features/chat/chat/basic-chat-input'
import { ChatMessagesViewport } from '@/features/chat/chat/chat-messages-viewport'
import {
	useLanguageStore,
	useSettingsStore,
} from '@/infrastructure/store/app-store'
import { chatKeys, customerKeys } from '@/shared/api/query-keys'
import { SYSTEM_AGENT } from '@/shared/config'
import { callPythonBackend } from '@/shared/libs/backend'
import { logger } from '@/shared/libs/logger'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { LoadingDots } from '@/shared/ui/loading-dots'
import { Spinner } from '@/shared/ui/spinner'
import {
	useConversationMessagesQuery,
	useCustomerNames,
	useTypingIndicator,
} from './hooks'
import type { CustomerName } from './hooks/useCustomerNames'

type ChatSidebarContentProps = {
	selectedConversationId: string | null
	onConversationSelect: (conversationId: string) => void
	onRefresh?: () => void
	className?: string
}

const TIME_FORMAT_REGEX = /^\d{2}:\d{2}(?::\d{2})?$/
const TIME_WITHOUT_SECONDS_LENGTH = 5
const LOAD_MORE_RESET_DELAY_MS = 100
const WHATSAPP_TYPING_WINDOW_MS = 15_000
const TYPING_THROTTLE_BUFFER_MS = 1000
const TYPING_THROTTLE_MS = WHATSAPP_TYPING_WINDOW_MS - TYPING_THROTTLE_BUFFER_MS
const TYPING_STOP_DEBOUNCE_MS = 4000

const logSidebarWarning = (context: string, error: unknown) => {
	logger.warn(`[ChatSidebar] ${context}`, error)
}

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

type MutationResponse<T> = {
	success: boolean
	data?: T
	message?: string
}

// message bubble moved to components/chat/message-bubble

export const ChatSidebarContent: React.FC<ChatSidebarContentProps> = ({
	selectedConversationId,
	onRefresh: _onRefresh,
	className,
}) => {
	const { isLocalized } = useLanguageStore()
	const { showToolCalls, chatMessageLimit, sendTypingIndicator } =
		useSettingsStore()
	const { isLoadingConversation, setLoadingConversation } =
		useSidebarChatStore()
	const queryClient = useQueryClient()

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
	const [isAwaitingAgentResponse, setIsAwaitingAgentResponse] = useState(false)
	const [loadedMessageCount, setLoadedMessageCount] =
		useState<number>(chatMessageLimit)
	const [isLoadingMore, setIsLoadingMore] = useState(false)
	const [isAtTop, setIsAtTop] = useState(false)
	const [isTyping, setIsTyping] = useState(false)
	const [isBlocking, setIsBlocking] = useState(false)
	const [isFavoriting, setIsFavoriting] = useState(false)
	const [isClearing, setIsClearing] = useState(false)
	const [dropdownOpen, setDropdownOpen] = useState(false)
	const [showClearConfirmDialog, setShowClearConfirmDialog] = useState(false)
	const typingControllerRef = useRef<{
		lastStartSent: number
		typingActive: boolean
		stopTimeout: number | null
		activeWaId: string | null
	}>({
		lastStartSent: 0,
		typingActive: false,
		stopTimeout: null,
		activeWaId: null,
	})
	const lastSystemAgentSendAtRef = useRef<number | null>(null)
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

	const sortedMessages = [...allMessages].sort(
		(a, b) => getMessageTimestamp(a) - getMessageTimestamp(b)
	) as ConversationMessage[]

	// Apply message limit (show last N messages)
	const limitedMessages = useMemo(
		() => sortedMessages.slice(-loadedMessageCount),
		[sortedMessages, loadedMessageCount]
	)

	const hasMoreMessages = sortedMessages.length > limitedMessages.length

	// Customer metadata for the active conversation (favorites / blocked)
	const { data: customerNames } = useCustomerNames()
	const shouldShowCombobox = Boolean(customerNames)
	const currentCustomer: CustomerName | undefined = selectedConversationId
		? customerNames?.[selectedConversationId]
		: undefined
	const conversationBlocked = Boolean(currentCustomer?.is_blocked)
	const conversationFavorited = Boolean(currentCustomer?.is_favorite)

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

	useEffect(() => {
		setIsAwaitingAgentResponse(false)
		lastSystemAgentSendAtRef.current = null
	}, [])

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

		if (conversationBlocked) {
			toastService.error(i18n.getMessage('chat_blocked_notice', isLocalized))
			return
		}

		setIsSending(true)
		if (isSystemAgentConversation) {
			setIsAwaitingAgentResponse(false)
		}

		try {
			await sendMessage(messageText)
			if (isSystemAgentConversation) {
				lastSystemAgentSendAtRef.current = Date.now()
				setIsAwaitingAgentResponse(true)
			}
		} catch (error) {
			logger.error('[ChatSidebar] Failed to send message', {
				error,
				conversationId: selectedConversationId,
				messageLength: messageText?.length,
			})

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
	const isSystemAgentConversation =
		hasConversationSelected && selectedConversationId === SYSTEM_AGENT.waId
	const handleStopAgentResponse = useCallback(() => {
		if (!(isSystemAgentConversation && isAwaitingAgentResponse)) {
			return
		}
		logger.info('[ChatSidebar] Stop agent response requested', {
			conversationId: selectedConversationId,
		})
		setIsAwaitingAgentResponse(false)
		// TODO: Integrate backend stop hook when available
	}, [
		isAwaitingAgentResponse,
		isSystemAgentConversation,
		selectedConversationId,
	])
	// Inactivity: last USER message > 24 hours ago (skip for system agent)
	const hasConversationTimedOut = useConversationActivity(limitedMessages)
	const defaultInactivityMessage =
		limitedMessages.length === 0
			? i18n.getMessage('chat_cannot_message_no_conversation', isLocalized)
			: i18n.getMessage('chat_messaging_unavailable', isLocalized)
	let restrictionMessage: string | undefined
	if (conversationBlocked) {
		restrictionMessage = i18n.getMessage('chat_blocked_notice', isLocalized)
	} else if (!isSystemAgentConversation && hasConversationTimedOut) {
		restrictionMessage = defaultInactivityMessage
	} else {
		restrictionMessage = undefined
	}
	const inputPlaceholder = hasConversationSelected
		? i18n.getMessage('chat_type_message', isLocalized)
		: i18n.getMessage('chat_no_conversation', isLocalized)
	const composerDisabled = !hasConversationSelected || isSending
	const favoriteItemDisabled =
		!hasConversationSelected || isFavoriting || isSystemAgentConversation
	const blockItemDisabled =
		!hasConversationSelected || isBlocking || isSystemAgentConversation
	const clearItemDisabled = !hasConversationSelected || isClearing
	const typingEnabled =
		Boolean(sendTypingIndicator) &&
		!conversationBlocked &&
		!isSystemAgentConversation

	const conversationActions = (
		<DropdownMenu onOpenChange={setDropdownOpen} open={dropdownOpen}>
			<DropdownMenuTrigger asChild>
				<Button
					aria-label={i18n.getMessage(
						'chat_actions_trigger_label',
						isLocalized
					)}
					className="h-7 w-7 rounded-full"
					size="icon"
					variant="ghost"
				>
					<MoreHorizontal className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-60">
				<DropdownMenuLabel>
					{i18n.getMessage('chat_actions_label', isLocalized)}
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					disabled={favoriteItemDisabled}
					onSelect={async () => {
						setDropdownOpen(false)
						await handleToggleFavorite()
					}}
				>
					<Star className="mr-2 h-4 w-4" />
					<span>
						{i18n.getMessage(
							conversationFavorited
								? 'chat_action_remove_favorite'
								: 'chat_action_add_favorite',
							isLocalized
						)}
					</span>
				</DropdownMenuItem>
				<DropdownMenuItem
					disabled={blockItemDisabled}
					onSelect={async () => {
						setDropdownOpen(false)
						await handleToggleBlock()
					}}
				>
					<Ban className="mr-2 h-4 w-4" />
					<span>
						{i18n.getMessage(
							conversationBlocked ? 'chat_action_unblock' : 'chat_action_block',
							isLocalized
						)}
					</span>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					className="text-destructive focus:text-destructive"
					disabled={clearItemDisabled}
					onSelect={() => {
						setDropdownOpen(false)
						setShowClearConfirmDialog(true)
					}}
				>
					<Trash2 className="mr-2 h-4 w-4" />
					<span>{i18n.getMessage('chat_action_clear', isLocalized)}</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)

	const { mutate: sendTypingMutation } = useTypingIndicator()

	const emitTyping = useCallback(
		(waId: string, typingState: boolean) => {
			try {
				sendTypingMutation(
					{ wa_id: waId, typing: typingState },
					{
						onError: (error) =>
							logSidebarWarning('Failed to dispatch typing indicator', error),
					}
				)
				if (!typingState && waId === selectedConversationId) {
					setIsTyping(false)
				}
			} catch (error) {
				logSidebarWarning('Editor typing throttler failed', error)
			}
		},
		[selectedConversationId, sendTypingMutation]
	)

	const scheduleTypingStop = useCallback(
		(waId: string) => {
			const controller = typingControllerRef.current
			if (controller.stopTimeout) {
				window.clearTimeout(controller.stopTimeout)
			}
			controller.stopTimeout = window.setTimeout(() => {
				controller.stopTimeout = null
				if (!controller.typingActive || controller.activeWaId !== waId) {
					return
				}
				emitTyping(waId, false)
				controller.typingActive = false
				controller.activeWaId = null
			}, TYPING_STOP_DEBOUNCE_MS)
		},
		[emitTyping]
	)

	const flushTypingState = useCallback(
		(waIdOverride?: string | null) => {
			const controller = typingControllerRef.current
			if (controller.stopTimeout) {
				window.clearTimeout(controller.stopTimeout)
				controller.stopTimeout = null
			}
			const targetWaId = waIdOverride ?? controller.activeWaId
			if (targetWaId && (controller.typingActive || waIdOverride)) {
				emitTyping(targetWaId, false)
			}
			controller.typingActive = false
			controller.activeWaId = null
			controller.lastStartSent = 0
			setIsTyping(false)
		},
		[emitTyping]
	)

	const handleComposerTyping = useCallback(() => {
		if (!(typingEnabled && selectedConversationId)) {
			return
		}
		const controller = typingControllerRef.current
		const now = Date.now()
		const isNewConversation =
			controller.activeWaId && controller.activeWaId !== selectedConversationId
		if (
			isNewConversation ||
			!controller.typingActive ||
			now - controller.lastStartSent >= TYPING_THROTTLE_MS
		) {
			emitTyping(selectedConversationId, true)
			controller.typingActive = true
			controller.activeWaId = selectedConversationId
			controller.lastStartSent = now
		}
		scheduleTypingStop(selectedConversationId)
	}, [emitTyping, scheduleTypingStop, selectedConversationId, typingEnabled])

	const previousConversationRef = useRef<string | null>(null)
	useEffect(() => {
		const previous = previousConversationRef.current
		if (previous && previous !== selectedConversationId) {
			flushTypingState(previous)
		}
		previousConversationRef.current = selectedConversationId
	}, [flushTypingState, selectedConversationId])

	useEffect(() => {
		if (!typingEnabled) {
			flushTypingState()
		}
		return () => {
			flushTypingState()
		}
	}, [flushTypingState, typingEnabled])

	useEffect(() => {
		if (!isSystemAgentConversation) {
			if (isAwaitingAgentResponse) {
				setIsAwaitingAgentResponse(false)
			}
			return
		}
		if (!isAwaitingAgentResponse) {
			return
		}
		const since = lastSystemAgentSendAtRef.current
		if (!since) {
			return
		}
		// Check all messages (including additional ones) for assistant reply
		const hasAgentReply = allMessages.some((message) => {
			const role = String(
				(message as { role?: string }).role || ''
			).toLowerCase()
			if (role !== 'assistant') {
				return false
			}
			return getMessageTimestamp(message) >= since
		})
		if (hasAgentReply) {
			setIsAwaitingAgentResponse(false)
		}
	}, [allMessages, isAwaitingAgentResponse, isSystemAgentConversation])

	useEffect(() => {
		if (typeof window === 'undefined') {
			return
		}
		const handlePageHide = () => {
			flushTypingState()
		}
		const handleVisibilityChange = () => {
			if (document.visibilityState === 'hidden') {
				flushTypingState()
			}
		}
		window.addEventListener('pagehide', handlePageHide)
		window.addEventListener('beforeunload', handlePageHide)
		window.addEventListener('freeze', handlePageHide)
		document.addEventListener('visibilitychange', handleVisibilityChange)
		return () => {
			window.removeEventListener('pagehide', handlePageHide)
			window.removeEventListener('beforeunload', handlePageHide)
			window.removeEventListener('freeze', handlePageHide)
			document.removeEventListener('visibilitychange', handleVisibilityChange)
		}
	}, [flushTypingState])

	const updateCustomerCache = useCallback(
		(
			waId: string,
			updater: (existing: CustomerName | undefined) => CustomerName
		) => {
			let updated = false
			queryClient.setQueryData<Record<string, CustomerName> | undefined>(
				customerKeys.names(),
				(previous) => {
					if (!previous) {
						return previous
					}
					updated = true
					const next = { ...previous }
					next[waId] = updater(next[waId])
					return next
				}
			)
			if (!updated) {
				queryClient
					.invalidateQueries({
						queryKey: customerKeys.names(),
						exact: true,
					})
					.catch((error) => {
						logSidebarWarning(
							'Failed to invalidate customer names query',
							error
						)
					})
			}
		},
		[queryClient]
	)

	// Listen for customer metadata updates (block/favorite) via WebSocket
	useEffect(() => {
		const handler = (ev: Event) => {
			try {
				const { wa_id, is_blocked, is_favorite } =
					(ev as CustomEvent).detail || {}
				if (!wa_id) {
					return
				}
				// Update cache for this customer
				updateCustomerCache(wa_id, (existing) => ({
					...(existing ?? {
						wa_id,
						customer_name: null,
					}),
					...(is_blocked !== undefined && { is_blocked }),
					...(is_favorite !== undefined && { is_favorite }),
				}))
				// Invalidate phone queries when favorite status changes
				if (is_favorite !== undefined) {
					queryClient.invalidateQueries({
						queryKey: ['phone-recent'],
					})
					queryClient.invalidateQueries({
						queryKey: ['phone-all'],
					})
				}
			} catch (error) {
				logSidebarWarning('metadata update event handler failed', error)
			}
		}
		window.addEventListener(
			'customers:metadata_updated',
			handler as EventListener
		)
		return () =>
			window.removeEventListener(
				'customers:metadata_updated',
				handler as EventListener
			)
	}, [updateCustomerCache, queryClient])

	const handleToggleFavorite = useCallback(async () => {
		if (!selectedConversationId || isSystemAgentConversation) {
			return
		}
		const waId = selectedConversationId
		const nextValue = !conversationFavorited
		setIsFavoriting(true)
		try {
			const response = await callPythonBackend<
				MutationResponse<{ wa_id: string; is_favorite: boolean }>
			>(`/customers/${encodeURIComponent(waId)}/favorite`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ favorite: nextValue }),
			})
			if (!response?.success) {
				throw new Error(
					response?.message || i18n.getMessage('chat_action_error', isLocalized)
				)
			}
			// Use the backend response data to ensure consistency
			const updatedFavoriteStatus = response?.data?.is_favorite ?? nextValue
			updateCustomerCache(waId, (existing) => ({
				...(existing ?? {
					wa_id: waId,
					customer_name: currentCustomer?.customer_name ?? null,
				}),
				is_favorite: updatedFavoriteStatus,
			}))
			// Invalidate query to ensure UI updates even if cache update fails
			await queryClient.invalidateQueries({
				queryKey: customerKeys.names(),
				exact: true,
			})
			// Force refetch to ensure UI updates
			await queryClient.refetchQueries({
				queryKey: customerKeys.names(),
				exact: true,
			})
			// Invalidate phone queries so phone selector updates
			await queryClient.invalidateQueries({
				queryKey: ['phone-recent'],
			})
			await queryClient.invalidateQueries({
				queryKey: ['phone-all'],
			})
			toastService.success(
				i18n.getMessage(
					updatedFavoriteStatus
						? 'chat_action_favorited'
						: 'chat_action_unfavorited',
					isLocalized
				)
			)
		} catch (error) {
			const message =
				error instanceof Error && error.message
					? error.message
					: i18n.getMessage('chat_action_error', isLocalized)
			toastService.error(message)
		} finally {
			setIsFavoriting(false)
		}
	}, [
		conversationFavorited,
		currentCustomer,
		isLocalized,
		isSystemAgentConversation,
		queryClient,
		selectedConversationId,
		updateCustomerCache,
	])

	const handleToggleBlock = useCallback(async () => {
		if (!selectedConversationId || isSystemAgentConversation) {
			return
		}
		const waId = selectedConversationId
		const nextValue = !conversationBlocked
		setIsBlocking(true)
		try {
			const response = await callPythonBackend<
				MutationResponse<{ wa_id: string; is_blocked: boolean }>
			>(`/customers/${encodeURIComponent(waId)}/block`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ blocked: nextValue }),
			})
			if (!response?.success) {
				throw new Error(
					response?.message || i18n.getMessage('chat_action_error', isLocalized)
				)
			}
			// Use the backend response data to ensure consistency
			const updatedBlockedStatus = response?.data?.is_blocked ?? nextValue
			updateCustomerCache(waId, (existing) => ({
				...(existing ?? {
					wa_id: waId,
					customer_name: currentCustomer?.customer_name ?? null,
				}),
				is_blocked: updatedBlockedStatus,
			}))
			// Invalidate query to ensure UI updates even if cache update fails
			await queryClient.invalidateQueries({
				queryKey: customerKeys.names(),
				exact: true,
			})
			// Force refetch to ensure UI updates
			await queryClient.refetchQueries({
				queryKey: customerKeys.names(),
				exact: true,
			})
			toastService.success(
				i18n.getMessage(
					updatedBlockedStatus
						? 'chat_action_blocked'
						: 'chat_action_unblocked',
					isLocalized
				)
			)
		} catch (error) {
			const message =
				error instanceof Error && error.message
					? error.message
					: i18n.getMessage('chat_action_error', isLocalized)
			toastService.error(message)
		} finally {
			setIsBlocking(false)
		}
	}, [
		conversationBlocked,
		currentCustomer,
		isLocalized,
		isSystemAgentConversation,
		queryClient,
		selectedConversationId,
		updateCustomerCache,
	])

	const handleClearConversation = useCallback(async () => {
		if (!selectedConversationId) {
			return
		}
		const waId = selectedConversationId
		setIsClearing(true)
		try {
			const response = await callPythonBackend<
				MutationResponse<{ deleted: number }>
			>(`/conversations/${encodeURIComponent(waId)}`, {
				method: 'DELETE',
			})
			if (!response?.success) {
				throw new Error(
					response?.message || i18n.getMessage('chat_action_error', isLocalized)
				)
			}
			queryClient.setQueryData<ConversationMessage[]>(
				chatKeys.messages(waId),
				() => []
			)
			setAdditionalMessages((previous) => {
				if (!previous[waId]) {
					return previous
				}
				return { ...previous, [waId]: [] }
			})
			setLoadedMessageCount(chatMessageLimit)
			toastService.success(i18n.getMessage('chat_action_cleared', isLocalized))
		} catch (error) {
			const message =
				error instanceof Error && error.message
					? error.message
					: i18n.getMessage('chat_action_error', isLocalized)
			toastService.error(message)
		} finally {
			setIsClearing(false)
		}
	}, [chatMessageLimit, isLocalized, queryClient, selectedConversationId])

	// Clear conversation confirmation dialog
	const titleId = useId()
	const [dialogMounted, setDialogMounted] = useState(false)

	useEffect(() => {
		if (!showClearConfirmDialog) {
			setDialogMounted(false)
			return
		}
		setDialogMounted(true)
		// Handle escape key
		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				setShowClearConfirmDialog(false)
			}
		}
		document.addEventListener('keydown', handleEscape)
		// Prevent body scroll when dialog is open
		document.body.style.overflow = 'hidden'
		return () => {
			document.removeEventListener('keydown', handleEscape)
			document.body.style.overflow = 'unset'
		}
	}, [showClearConfirmDialog])

	const clearConfirmDialog =
		dialogMounted && showClearConfirmDialog ? (
			<>
				{/* Backdrop */}
				<button
					aria-label={i18n.getMessage('close_dialog', isLocalized)}
					className="fixed inset-0 bg-black/80 backdrop-blur-sm"
					onClick={() => setShowClearConfirmDialog(false)}
					style={{
						zIndex: 'var(--z-confirmation-overlay-backdrop)',
						pointerEvents: 'auto',
					}}
					type="button"
				/>

				{/* Dialog Content */}
				<div
					className="fixed inset-0 flex items-center justify-center p-4"
					style={{
						zIndex: 'var(--z-confirmation-overlay-content)',
						pointerEvents: 'auto',
					}}
				>
					<dialog
						aria-labelledby={titleId}
						className="fade-in-0 zoom-in-95 mx-auto w-full max-w-md animate-in rounded-lg border bg-background p-6 shadow-lg duration-200"
						open
					>
						<div className="space-y-3 text-center">
							<div className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
								<AlertTriangle className="size-6 text-red-600 dark:text-red-400" />
							</div>
							<h2 className="font-semibold text-lg" id={titleId}>
								{i18n.getMessage('clear_conversation', isLocalized)}
							</h2>
							<p className="mt-1 text-muted-foreground text-sm">
								{i18n.getMessage('clear_conversation_warning', isLocalized)}
							</p>
						</div>
						<div className="mt-4 flex items-center justify-end gap-2">
							<Button
								onClick={() => setShowClearConfirmDialog(false)}
								variant="outline"
							>
								{i18n.getMessage('cancel', isLocalized)}
							</Button>
							<Button
								className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
								disabled={isClearing}
								onClick={async () => {
									setShowClearConfirmDialog(false)
									await handleClearConversation()
								}}
							>
								{isClearing ? (
									<>
										<Spinner className="mr-2 h-4 w-4" />
										{i18n.getMessage('clearing', isLocalized)}
									</>
								) : (
									<>
										<Trash2 className="mr-2 h-4 w-4" />
										{i18n.getMessage('clear', isLocalized)}
									</>
								)}
							</Button>
						</div>
					</dialog>
				</div>
			</>
		) : null

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
				{isTyping && (
					<div className="mb-2">
						<article
							aria-live="polite"
							className="relative w-full rounded-lg border border-ring/20 bg-gradient-to-b from-ring/20 to-ring/10 p-2.5"
						>
							<div className="flex items-center gap-2">
								<div
									aria-hidden="true"
									className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-muted-foreground font-medium text-background text-xs"
								>
									<Bot className="h-3.5 w-3.5" />
								</div>
								<div className="min-w-0 flex-1">
									<div className="text-muted-foreground text-sm">
										<LoadingDots size={4}>
											<span className="text-xs">
												{i18n.getMessage('typing', isLocalized)}
											</span>
										</LoadingDots>
									</div>
								</div>
							</div>
						</article>
					</div>
				)}
				<BasicChatInput
					actionSlot={conversationActions}
					canStopAgentResponse={isAwaitingAgentResponse}
					disabled={composerDisabled}
					inactiveText={restrictionMessage}
					isInactive={Boolean(restrictionMessage)}
					isLocalized={isLocalized}
					isSending={isSending}
					key={selectedConversationId ?? 'no-conversation'}
					maxCharacters={
						isSystemAgentConversation ? Number.POSITIVE_INFINITY : null
					}
					onSend={handleSendMessage}
					{...(isSystemAgentConversation
						? { onStopAgentResponse: handleStopAgentResponse }
						: {})}
					{...(typingEnabled ? { onTyping: handleComposerTyping } : {})}
					placeholder={inputPlaceholder}
				/>
			</div>
			{clearConfirmDialog && createPortal(clearConfirmDialog, document.body)}
		</div>
	)
}
