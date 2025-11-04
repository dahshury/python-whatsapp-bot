'use client'

import { i18n } from '@shared/libs/i18n'
import { useSidebarChatStore } from '@shared/libs/store/sidebar-chat-store'
import { Button } from '@ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { PhoneOption } from '@/entities/phone'
import { useReservationsForDateRange } from '@/features/calendar/hooks/useCalendarReservations'
import { CustomerStatsCard } from '@/features/dashboard/customer-stats-card'
import { ButtonGroup } from '@/shared/ui/button-group'
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from '@/shared/ui/hover-card'
import { PhoneCombobox } from '@/shared/ui/phone-combobox'
import { useCustomerNames } from './hooks/useCustomerNames'

type ConversationComboboxProps = {
	selectedConversationId: string | null
	onConversationSelect: (conversationId: string) => void
	isLocalized?: boolean
}

const HOVER_CARD_OPEN_DELAY_MS = 1500
const HOVER_CARD_CLOSE_DELAY_MS = 100

export const ConversationCombobox: React.FC<ConversationComboboxProps> = ({
	selectedConversationId,
	onConversationSelect,
	isLocalized = false,
}) => {
	const [showHoverCard, setShowHoverCard] = useState(false)
	const [hoverTimer, setHoverTimer] = useState<NodeJS.Timeout | null>(null)
	const [closeTimer, setCloseTimer] = useState<NodeJS.Timeout | null>(null)

	const hoverCardRef = useRef<HTMLDivElement>(null)

	// Use persistent chat store for managing conversation selection
	const {
		selectedConversationId: persistentSelectedId,
		setSelectedConversation,
		_hasHydrated,
	} = useSidebarChatStore()

	// Fetch customer names using TanStack Query (all customers, not just those with conversations)
	const { data: customerNames } = useCustomerNames()

	// Fetch reservations on-demand using TanStack Query (last 30 days + next 90 days)
	// Used for sorting conversation options and displaying in hover card
	const { data: reservations = {} } = useReservationsForDateRange(
		undefined, // Use default (30 days ago)
		undefined, // Use default (90 days from now)
		false // Don't include cancelled reservations
	)

	// Only use persisted selection after hydration is complete, otherwise use prop
	const effectiveSelectedId =
		_hasHydrated && persistentSelectedId
			? persistentSelectedId
			: selectedConversationId

	// Create conversation options from customer names (not conversations)
	const conversationOptions = React.useMemo(() => {
		if (!customerNames) {
			return []
		}

		return Object.entries(customerNames)
			.map(([waId, customer]) => {
				const key = String(waId ?? '')
				// Get last message from reservations for sorting (if available)
				const reservationEntries = reservations[key] ?? []
				const lastReservation = reservationEntries.at(-1)

				return {
					value: key,
					label: customer.customer_name
						? `${customer.customer_name} (${key})`
						: key,
					customerName: customer.customer_name || null,
					messageCount: 0, // Not needed - conversations loaded on-demand
					lastMessage: undefined, // Not needed - conversations loaded on-demand
					lastReservation, // Use for sorting
					hasConversation: true,
				}
			})
			.sort((a, b) => {
				// Multi-criteria sorting: 1) last reservation time, 2) has name, 3) phone number

				// 1. Sort by most recent reservation first (primary criteria)
				if (a.lastReservation && b.lastReservation) {
					const aReservationTime = new Date(
						`${a.lastReservation.date || ''} ${a.lastReservation.time_slot || ''}`
					).getTime()
					const bReservationTime = new Date(
						`${b.lastReservation.date || ''} ${b.lastReservation.time_slot || ''}`
					).getTime()
					const aIsValid = !Number.isNaN(aReservationTime)
					const bIsValid = !Number.isNaN(bReservationTime)
					if (aIsValid && bIsValid) {
						const timeDiff = bReservationTime - aReservationTime
						if (timeDiff !== 0) {
							return timeDiff
						}
					}
				}
				if (a.lastReservation && !b.lastReservation) {
					return -1 // a has reservation, b doesn't - a comes first
				}
				if (!a.lastReservation && b.lastReservation) {
					return 1 // b has reservation, a doesn't - b comes first
				}

				// 2. Sort by customers who have names (secondary criteria)
				const aHasName = !!a.customerName
				const bHasName = !!b.customerName
				if (aHasName && !bHasName) {
					return -1 // a has name, b doesn't - a comes first
				}
				if (!aHasName && bHasName) {
					return 1 // b has name, a doesn't - b comes first
				}

				// 3. Sort by phone number (tertiary criteria)
				return a.value.localeCompare(b.value, undefined, { numeric: true })
			})
	}, [customerNames, reservations])

	// Current index for navigation (must be after conversationOptions is defined)
	const currentIndex = conversationOptions.findIndex(
		(opt) => opt.value === effectiveSelectedId
	)

	// Enhanced conversation selection handler that updates persistent store
	const handleConversationSelect = useCallback(
		(conversationId: string) => {
			// Update the persistent store
			setSelectedConversation(conversationId)

			// Also call the parent callback for any additional logic
			onConversationSelect(conversationId)
		},
		[setSelectedConversation, onConversationSelect]
	)

	// Navigation handlers
	const handlePrevious = () => {
		if (conversationOptions.length === 0) {
			return
		}
		// Move toward older items; stop at the end
		if (currentIndex >= conversationOptions.length - 1) {
			return
		}
		const newIndex = currentIndex + 1
		const selectedOption = conversationOptions[newIndex]
		if (selectedOption) {
			handleConversationSelect(selectedOption.value)
		}
	}

	const handleNext = () => {
		if (conversationOptions.length === 0) {
			return
		}
		// Move toward newer items; stop at the start
		if (currentIndex <= 0) {
			return
		}
		const newIndex = currentIndex - 1
		const selectedOption = conversationOptions[newIndex]
		if (selectedOption) {
			handleConversationSelect(selectedOption.value)
		}
	}

	// Clear timers when component unmounts
	useEffect(
		() => () => {
			if (hoverTimer) {
				clearTimeout(hoverTimer)
			}
			if (closeTimer) {
				clearTimeout(closeTimer)
			}
		},
		[hoverTimer, closeTimer]
	)

	// Removed local search state; PhoneCombobox manages its own input

	const handleMouseEnter = useCallback(() => {
		// Only start timer if we have a selected conversation
		if (effectiveSelectedId) {
			// Clear any close timer
			if (closeTimer) {
				clearTimeout(closeTimer)
				setCloseTimer(null)
			}

			// Clear any existing hover timer
			if (hoverTimer) {
				clearTimeout(hoverTimer)
			}

			const timer = setTimeout(() => {
				setShowHoverCard(true)
			}, HOVER_CARD_OPEN_DELAY_MS)
			setHoverTimer(timer)
		}
	}, [effectiveSelectedId, closeTimer, hoverTimer])

	const handleMouseLeave = useCallback(
		(e: React.MouseEvent) => {
			// Check if we're moving to the hover card
			const relatedTarget = e.relatedTarget as EventTarget | null
			const hoverEl = hoverCardRef.current
			if (
				relatedTarget &&
				hoverEl &&
				relatedTarget instanceof Node &&
				hoverEl.contains(relatedTarget as Node)
			) {
				// Moving to hover card, keep it open
				return
			}

			// Clear any pending hover timer
			if (hoverTimer) {
				clearTimeout(hoverTimer)
				setHoverTimer(null)
			}

			// Clear any existing close timer
			if (closeTimer) {
				clearTimeout(closeTimer)
			}

			// Use a small delay before closing to prevent flicker
			const timer = setTimeout(() => {
				setShowHoverCard(false)
			}, HOVER_CARD_CLOSE_DELAY_MS)

			setCloseTimer(timer)
		},
		[hoverTimer, closeTimer]
	)

	// Note: Scroll behavior is now handled by the PhoneCombobox component

	// Build PhoneCombobox options from centralized customer data, sorted by recency
	const phoneOptions: PhoneOption[] = React.useMemo(() => {
		const getReservationTimestamp = (entry: {
			start?: string
			end?: string
			date?: string
			updated_at?: string
			modified_at?: string
			last_modified?: string
			modified_on?: string
			update_ts?: string
		}) => {
			const candidates = [
				entry?.start,
				entry?.end,
				entry?.date,
				entry?.updated_at,
				entry?.modified_at,
				entry?.last_modified,
				entry?.modified_on,
				entry?.update_ts,
			]
			for (const candidate of candidates) {
				if (candidate && typeof candidate === 'string') {
					const ts = Date.parse(candidate)
					if (!Number.isNaN(ts)) {
						return ts
					}
				}
			}
			return 0
		}

		if (!customerNames) {
			return []
		}

		const enriched = Object.entries(customerNames).map(([waId, customer]) => {
			const key = String(waId ?? '')
			// Conversations are loaded on-demand - no need to include them here
			const reservationEntries = reservations[key] ?? []
			const lastReservationTime = reservationEntries.reduce<number>(
				(latest, entry) => {
					const ts = getReservationTimestamp(entry)
					if (!ts) {
						return latest
					}
					return Math.max(latest, ts)
				},
				0
			)
			return {
				number: key,
				name: customer.customer_name || '',
				country: 'US',
				label: customer.customer_name || key,
				id: key,
				__lastMessageTime: 0, // Not used - conversations loaded on-demand
				__lastReservationTime: lastReservationTime,
			}
		})
		enriched.sort(
			(a, b) => (b.__lastReservationTime || 0) - (a.__lastReservationTime || 0)
		)
		return enriched.map(
			({ __lastMessageTime, __lastReservationTime, ...rest }) => ({
				...rest,
				...(__lastMessageTime ? { lastMessageAt: __lastMessageTime } : {}),
				...(__lastReservationTime
					? { lastReservationAt: __lastReservationTime }
					: {}),
			})
		)
	}, [customerNames, reservations])

	return (
		<div className="space-y-2">
			{/* Navigation Row */}
			<ButtonGroup
				aria-label={i18n.getMessage('conversation_navigation', isLocalized)}
				className="flex w-full min-w-0 max-w-full items-stretch overflow-hidden"
				orientation="horizontal"
			>
				<Button
					className="h-8 w-8 p-0"
					disabled={
						conversationOptions.length === 0 ||
						currentIndex === conversationOptions.length - 1
					}
					onClick={handlePrevious}
					size="sm"
					title={i18n.getMessage('older', isLocalized)}
					variant="outline"
				>
					<ChevronLeft className="h-4 w-4" />
				</Button>

				{/* Conversation Selector with HoverCard */}
				<div className="min-w-0 max-w-full flex-1 overflow-hidden">
					<HoverCard open={showHoverCard}>
						<HoverCardTrigger asChild>
							<div className="w-full max-w-full">
								<PhoneCombobox
									className="w-full min-w-0 max-w-full"
									onChange={handleConversationSelect}
									onMouseEnter={handleMouseEnter}
									onMouseLeave={handleMouseLeave}
									phoneOptions={phoneOptions}
									placeholder={i18n.getMessage(
										'chat_select_conversation',
										isLocalized
									)}
									preferPlaceholderWhenEmpty={true}
									rounded={false}
									showCountrySelector={false}
									showNameAndPhoneWhenClosed={true}
									shrinkTextToFit={true}
									size="sm"
									uncontrolled={false}
									value={effectiveSelectedId || ''}
								/>
							</div>
						</HoverCardTrigger>

						{effectiveSelectedId && (
							<HoverCardContent
								align="center"
								className="z-50 w-[18.75rem] p-0"
								onMouseEnter={() => {
									// Clear any close timer when entering hover card
									if (closeTimer) {
										clearTimeout(closeTimer)
										setCloseTimer(null)
									}
									// Clear hover timer too
									if (hoverTimer) {
										clearTimeout(hoverTimer)
										setHoverTimer(null)
									}
								}}
								onMouseLeave={(e: React.MouseEvent) => {
									// Check if we're moving back to the trigger (PhoneCombobox)
									const relatedTarget = e.relatedTarget as HTMLElement
									if (
										relatedTarget &&
										(e.currentTarget as HTMLElement).contains(relatedTarget)
									) {
										return
									}
									// Otherwise close the hover card after a small delay
									const timer = setTimeout(() => {
										setShowHoverCard(false)
									}, HOVER_CARD_CLOSE_DELAY_MS)
									setCloseTimer(timer)
								}}
								ref={hoverCardRef}
								sideOffset={5}
							>
								<CustomerStatsCard
									conversations={{}} // Empty - conversations loaded on-demand
									isHoverCard={true}
									isLocalized={isLocalized}
									reservations={reservations}
									selectedConversationId={effectiveSelectedId}
								/>
							</HoverCardContent>
						)}
					</HoverCard>
				</div>

				<Button
					className="h-8 w-8 p-0"
					disabled={conversationOptions.length === 0 || currentIndex === 0}
					onClick={handleNext}
					size="sm"
					title={i18n.getMessage('more_recent', isLocalized)}
					variant="outline"
				>
					<ChevronRight className="h-4 w-4" />
				</Button>
			</ButtonGroup>
		</div>
	)
}
