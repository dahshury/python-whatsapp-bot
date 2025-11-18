'use client'

import { i18n } from '@shared/libs/i18n'
import { useSidebarChatStore } from '@shared/libs/store/sidebar-chat-store'
import { Button } from '@ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PhoneOption } from '@/entities/phone'
import { useReservationsForDateRange } from '@/features/calendar/hooks/useCalendarReservations'
import { CustomerStatsCard } from '@/features/dashboard/customer-stats-card'
import { useRecentContacts } from '@/features/phone-selector'
import { SYSTEM_AGENT } from '@/shared/config'
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

type ReservationEntry = {
	start?: string
	end?: string
	date?: string
	time?: string
	time_slot?: string
	updated_at?: string
	modified_at?: string
	last_modified?: string
	modified_on?: string
	update_ts?: string
}

type EnrichedContact = {
	waId: string
	label: string
	customerName: string | null
	lastMessageAt: number
	lastReservationTime: number
	isFavorite: boolean
}

const RESERVATION_TIMESTAMP_FIELDS: ReadonlyArray<keyof ReservationEntry> = [
	'start',
	'end',
	'updated_at',
	'modified_at',
	'last_modified',
	'modified_on',
	'update_ts',
	'date',
]

function getReservationTimestamp(entry: ReservationEntry | undefined): number {
	if (!entry) {
		return 0
	}

	const date = entry.date || null
	const timeSlot = entry.time_slot || entry.time || null

	if (date && timeSlot) {
		const combined = Date.parse(`${date} ${timeSlot}`)
		if (!Number.isNaN(combined)) {
			return combined
		}
	}

	for (const field of RESERVATION_TIMESTAMP_FIELDS) {
		const candidate = entry[field]
		if (!candidate || typeof candidate !== 'string') {
			continue
		}
		const timestamp = Date.parse(candidate)
		if (!Number.isNaN(timestamp)) {
			return timestamp
		}
	}

	return 0
}

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

	const { contacts: recentContacts } = useRecentContacts()

	const recentMessageLookup = useMemo(() => {
		const map = new Map<string, number>()

		const register = (key: string | undefined, value: number) => {
			if (!key || value <= 0) {
				return
			}
			const existing = map.get(key)
			if (!existing || existing < value) {
				map.set(key, value)
			}
		}

		for (const contact of recentContacts) {
			const timestamp = contact.lastMessageAt ?? 0
			if (!timestamp) {
				continue
			}

			register(contact.id, timestamp)

			if (contact.id) {
				const stripped = contact.id.startsWith('+')
					? contact.id.slice(1)
					: contact.id
				register(stripped, timestamp)
				register(
					contact.id.startsWith('+') ? contact.id : `+${contact.id}`,
					timestamp
				)
			}

			register(contact.number, timestamp)

			if (contact.number) {
				const strippedNumber = contact.number.startsWith('+')
					? contact.number.slice(1)
					: contact.number
				register(strippedNumber, timestamp)
			}
		}

		return map
	}, [recentContacts])

	// Only use persisted selection after hydration is complete, otherwise use prop
	const effectiveSelectedId =
		_hasHydrated && persistentSelectedId
			? persistentSelectedId
			: selectedConversationId

	const enrichedContacts = useMemo<EnrichedContact[]>(() => {
		if (!customerNames) {
			return []
		}

		return Object.entries(customerNames).map(([waId, customer]) => {
			const key = String(waId ?? '')
			const normalizedKey = key.startsWith('+') ? key.slice(1) : key
			const plusKey = key.startsWith('+') ? key : `+${normalizedKey}`
			const resolvedName =
				customer.customer_name ||
				(key === SYSTEM_AGENT.waId ? SYSTEM_AGENT.displayName : null)

			const messageTimestamps = [
				recentMessageLookup.get(key) ?? 0,
				recentMessageLookup.get(normalizedKey) ?? 0,
				recentMessageLookup.get(plusKey) ?? 0,
			]
			const lastMessageAt = Math.max(...messageTimestamps, 0)

			const reservationEntries: ReservationEntry[] = []
			const reservationKeys = new Set([key, normalizedKey, plusKey])
			for (const candidate of reservationKeys) {
				const entries = Array.isArray(reservations[candidate])
					? (reservations[candidate] as ReservationEntry[])
					: []
				reservationEntries.push(...entries)
			}

			const lastReservationTime = reservationEntries.reduce((latest, entry) => {
				const ts = getReservationTimestamp(entry)
				return ts > latest ? ts : latest
			}, 0)

			return {
				waId: key,
				label: resolvedName ? `${resolvedName} (${key})` : key,
				customerName: resolvedName || null,
				lastMessageAt,
				lastReservationTime,
				isFavorite: Boolean(customer.is_favorite),
			}
		})
	}, [customerNames, reservations, recentMessageLookup])

	const sortedContacts = useMemo(() => {
		const contacts = [...enrichedContacts]
		contacts.sort((a, b) => {
			const messageDiff = (b.lastMessageAt ?? 0) - (a.lastMessageAt ?? 0)
			if (messageDiff !== 0) {
				return messageDiff
			}

			const reservationDiff =
				(b.lastReservationTime ?? 0) - (a.lastReservationTime ?? 0)
			if (reservationDiff !== 0) {
				return reservationDiff
			}

			const aHasName = Boolean(a.customerName)
			const bHasName = Boolean(b.customerName)
			if (aHasName !== bHasName) {
				return aHasName ? -1 : 1
			}

			return a.waId.localeCompare(b.waId, undefined, { numeric: true })
		})

		return contacts
	}, [enrichedContacts])

	const conversationOptions = useMemo(
		() =>
			sortedContacts.map((contact) => ({
				value: contact.waId,
				label: contact.label,
				customerName: contact.customerName,
				messageCount: 0,
				lastMessage: undefined,
				hasConversation: true,
				lastMessageAt: contact.lastMessageAt,
				lastReservationTime: contact.lastReservationTime,
			})),
		[sortedContacts]
	)

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
	const phoneOptions: PhoneOption[] = useMemo(
		() =>
			sortedContacts.map((contact) => ({
				number: contact.waId,
				name: contact.customerName || '',
				country: 'US',
				label: contact.customerName || contact.waId,
				id: contact.waId,
				...(contact.lastMessageAt
					? { lastMessageAt: contact.lastMessageAt }
					: {}),
				...(contact.lastReservationTime
					? { lastReservationAt: contact.lastReservationTime }
					: {}),
				is_favorite: contact.isFavorite,
			})),
		[sortedContacts]
	)

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
									isHoverCard={true}
									isLocalized={isLocalized}
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
