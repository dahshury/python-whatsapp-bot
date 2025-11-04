'use client'

import { i18n } from '@shared/libs/i18n'
import { Badge } from '@ui/badge'
import { Card, CardContent } from '@ui/card'
import { Calendar, Clock, MessageCircle, User } from 'lucide-react'
import { memo, useState } from 'react'
import type { ConversationMessage } from '@/entities/conversation'
import type { Reservation } from '@/entities/event'
import { CustomerReservationsGrid } from '@/features/dashboard/customer-reservations-grid'
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/shared/ui/animate-ui/components/radix/accordion'
import { Avatar, AvatarFallback } from '@/shared/ui/avatar'
import { InlineCopyBtn } from '@/shared/ui/inline-copy-btn'
import { MagicCard } from '@/shared/ui/magicui/magic-card'

const SAUDI_LOCAL_PREFIX = '5'
const SAUDI_LOCAL_LENGTH = 9
const SAUDI_COUNTRY_CODE = '+966'
const DECIMAL_RADIX = 10
const MERIDIEM_THRESHOLD = 12
const HOURS_ON_12_HOUR_CLOCK = 12

type CustomerStatsCardProps = {
	selectedConversationId: string
	conversations: Record<string, ConversationMessage[]>
	reservations: Record<string, Reservation[]>
	isLocalized: boolean
	isHoverCard?: boolean
}

export const CustomerStatsCard = memo(function CustomerStatsCardComponent({
	selectedConversationId,
	conversations,
	reservations,
	isLocalized,
	isHoverCard = false,
}: CustomerStatsCardProps) {
	const conversation = conversations[selectedConversationId] || []
	const customerReservations = reservations[selectedConversationId] || []
	const customerName = customerReservations[0]?.customer_name || null

	// State for accordion
	const [accordionValue, setAccordionValue] = useState<string>('')

	// Format phone number for PhoneInput component
	const formatPhoneForInput = (phone: string) => {
		// Remove any spaces, dashes, or parentheses from the phone number
		const cleanPhone = phone.replace(/[\s\-()]/g, '')

		// If already has +, return cleaned version
		if (cleanPhone.startsWith('+')) {
			return cleanPhone
		}

		// Check if it's a Saudi number without country code (starts with 5)
		if (
			cleanPhone.startsWith(SAUDI_LOCAL_PREFIX) &&
			cleanPhone.length === SAUDI_LOCAL_LENGTH
		) {
			return `${SAUDI_COUNTRY_CODE}${cleanPhone}`
		}

		// Otherwise add + prefix
		return `+${cleanPhone}`
	}

	const formattedPhone = formatPhoneForInput(selectedConversationId)

	// Calculate conversation stats
	const messageCount = conversation.length
	const lastMessage = conversation.length > 0 ? conversation.at(-1) : null

	// Get first message date for "customer since"
	const firstMessage =
		conversation.length > 0
			? [...conversation].sort((a, b) => {
					const aTime = new Date(`${a.date} ${a.time}`)
					const bTime = new Date(`${b.date} ${b.time}`)
					return aTime.getTime() - bTime.getTime()
				})[0]
			: null

	const formatDate = (dateStr: string) => {
		try {
			// Validate date string before parsing
			if (!dateStr || dateStr === 'Invalid Date' || dateStr === '') {
				return i18n.getMessage('date_unknown', isLocalized)
			}
			const date = new Date(dateStr)
			// Check if date is valid
			if (Number.isNaN(date.getTime())) {
				return i18n.getMessage('date_unknown', isLocalized)
			}
			return date.toLocaleDateString(isLocalized ? 'ar-SA' : 'en-US', {
				month: 'short',
				day: 'numeric',
				year: 'numeric',
			})
		} catch {
			return i18n.getMessage('date_unknown', isLocalized)
		}
	}

	const formatTime = (timeStr: string) => {
		try {
			// Validate time string before parsing
			if (!timeStr || timeStr === 'Invalid Date' || timeStr === '') {
				return ''
			}
			// Handle various time formats
			if (timeStr.includes('AM') || timeStr.includes('PM')) {
				return timeStr
			}
			// Convert 24-hour format to 12-hour format
			const [hours, minutes] = timeStr.split(':')
			if (!(hours && minutes)) {
				return ''
			}
			const hour = Number.parseInt(hours, DECIMAL_RADIX)
			const ampm = hour >= MERIDIEM_THRESHOLD ? 'PM' : 'AM'
			const hour12 = hour % HOURS_ON_12_HOUR_CLOCK || HOURS_ON_12_HOUR_CLOCK
			return `${hour12}:${minutes} ${ampm}`
		} catch {
			return ''
		}
	}

	return (
		<div className={isHoverCard ? '' : 'mb-2'}>
			<MagicCard
				className={`bg-background/90 ${isHoverCard ? 'border-0 shadow-none' : ''}`}
				gradientColor="hsl(var(--muted-foreground) / 0.1)"
				gradientFrom="hsl(var(--primary))"
				gradientOpacity={0.6}
				gradientSize={200}
				gradientTo="hsl(var(--accent))"
			>
				<Card className="border-0 bg-transparent shadow-none">
					<CardContent className={isHoverCard ? 'p-1' : 'p-2'}>
						{/* Fixed Customer Info Section */}
						<div className={`${isHoverCard ? 'space-y-1' : 'space-y-2'}`}>
							{/* Header with Avatar on left, Name and Phone in center */}
							<div
								className={`flex items-center ${isHoverCard ? 'gap-2' : 'gap-3'}`}
							>
								<Avatar
									className={
										isHoverCard
											? 'h-8 w-8 flex-shrink-0'
											: 'h-10 w-10 flex-shrink-0'
									}
								>
									<AvatarFallback
										className={`bg-primary/10 text-primary ${isHoverCard ? 'text-sm' : 'text-base'}`}
									>
										{customerName ? (
											customerName.charAt(0).toUpperCase()
										) : (
											<User className={isHoverCard ? 'h-4 w-4' : 'h-5 w-5'} />
										)}
									</AvatarFallback>
								</Avatar>

								<div
									className={`flex flex-1 flex-col items-center justify-center text-center ${isHoverCard ? 'min-w-0 px-1' : ''}`}
								>
									{customerName ? (
										<div
											className={`font-medium ${isHoverCard ? 'text-xs' : 'text-sm'} w-full truncate`}
										>
											{customerName}
										</div>
									) : (
										<div
											className={`text-muted-foreground ${isHoverCard ? 'text-xs' : 'text-sm'} w-full truncate`}
										>
											{i18n.getMessage('customer_unknown', isLocalized)}
										</div>
									)}

									<div
										className={`${isHoverCard ? 'w-full scale-90' : 'w-full'} mt-0.5 flex justify-center`}
									>
										<span
											className={`text-muted-foreground ${isHoverCard ? 'text-xs' : 'text-sm'} font-mono`}
										>
											{formattedPhone}
										</span>
									</div>
								</div>

								<div
									className={`flex-shrink-0 ${isHoverCard ? 'flex w-6 justify-center' : ''}`}
								>
									<InlineCopyBtn
										className="opacity-60 hover:opacity-100"
										isLocalized={isLocalized}
										text={selectedConversationId}
									/>
								</div>
							</div>

							{/* Stats Section */}
							<div
								className={`${isHoverCard ? 'space-y-0.5 px-0.5' : 'space-y-1 px-1'}`}
							>
								{/* Customer Since */}
								{firstMessage?.date && (
									<div
										className={`flex items-center justify-between text-xs ${isHoverCard ? 'py-0' : 'py-0.5'}`}
									>
										<div className="flex items-center gap-1">
											<User
												className={isHoverCard ? 'h-2.5 w-2.5' : 'h-3 w-3'}
											/>
											<span>
												{i18n.getMessage('customer_since', isLocalized)}
											</span>
										</div>
										<span className="text-[0.625rem] text-muted-foreground">
											{formatDate(firstMessage.date)}
										</span>
									</div>
								)}

								{/* Messages */}
								<div
									className={`flex items-center justify-between text-xs ${isHoverCard ? 'py-0' : 'py-0.5'}`}
								>
									<div className="flex items-center gap-1">
										<MessageCircle
											className={isHoverCard ? 'h-2.5 w-2.5' : 'h-3 w-3'}
										/>
										<span>{i18n.getMessage('msg_messages', isLocalized)}</span>
									</div>
									<Badge
										className="h-4 px-1 text-[0.625rem]"
										variant="secondary"
									>
										{messageCount}
									</Badge>
								</div>

								{/* Last Message */}
								{lastMessage?.date && (
									<div
										className={`flex items-center justify-between text-xs ${isHoverCard ? 'py-0' : 'py-0.5'}`}
									>
										<div className="flex items-center gap-1">
											<Clock
												className={isHoverCard ? 'h-2.5 w-2.5' : 'h-3 w-3'}
											/>
											<span>
												{i18n.getMessage('customer_last_message', isLocalized)}
											</span>
										</div>
										<span className="text-[0.625rem] text-muted-foreground">
											{formatDate(lastMessage.date)}
											{lastMessage?.time && formatTime(lastMessage.time) && (
												<> {formatTime(lastMessage.time)}</>
											)}
										</span>
									</div>
								)}
							</div>
						</div>

						{/* Reservations Accordion */}
						{customerReservations.length > 0 && (
							<Accordion
								className="mt-2 w-full"
								collapsible
								onValueChange={setAccordionValue}
								type="single"
								value={accordionValue}
							>
								<AccordionItem className="border-b-0" value="reservations">
									<AccordionTrigger
										className={`${isHoverCard ? 'px-0.5 py-0.5' : 'px-1 py-1'} font-medium text-xs hover:no-underline`}
									>
										<div className="flex items-center gap-1">
											<Calendar
												className={isHoverCard ? 'h-2.5 w-2.5' : 'h-3 w-3'}
											/>
											<span>
												{i18n.getMessage('customer_reservations', isLocalized)}
											</span>
											<Badge
												className="ml-auto h-4 px-1 text-[0.625rem]"
												variant="outline"
											>
												{customerReservations.length}
											</Badge>
										</div>
									</AccordionTrigger>
									<AccordionContent className={isHoverCard ? 'pb-0.5' : 'pb-1'}>
										<div className={isHoverCard ? 'px-0.5' : 'px-1'}>
											<CustomerReservationsGrid
												isLocalized={isLocalized}
												reservations={customerReservations}
											/>
										</div>
									</AccordionContent>
								</AccordionItem>
							</Accordion>
						)}
					</CardContent>
				</Card>
			</MagicCard>
		</div>
	)
})
