'use client'

import { i18n } from '@shared/libs/i18n'
import {
	Calendar,
	CalendarX,
	Clock,
	FileText,
	MessageCircle,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CalendarEvent } from '@/entities/event'
import { useLanguageStore } from '@/infrastructure/store/app-store'

type CalendarEventContextMenuProps = {
	event: CalendarEvent | null
	position: { x: number; y: number } | null
	onClose: () => void
	onCancelReservation?: (eventId: string) => void
	onEditReservation?: (eventId: string) => void
	onViewDetails?: (eventId: string) => void
	onOpenConversation?: (eventId: string) => void
	onOpenDocument?: (eventId: string) => void
}

export function CalendarEventContextMenu({
	event,
	position,
	onClose,
	onCancelReservation,
	onOpenConversation,
	onOpenDocument,
}: CalendarEventContextMenuProps) {
	const { isLocalized } = useLanguageStore()
	const [mounted, setMounted] = useState(false)
	const menuRef = useRef<HTMLDivElement>(null)
	const MENU_WIDTH = 310
	const VIEWPORT_MARGIN = 8
	const MIN_EDGE_DISTANCE = 8
	// Estimate menu height: header (~60px) + separator + items (~40-50px each) + padding
	// Conservative estimate for initial positioning
	const ESTIMATED_MENU_HEIGHT = 200

	useEffect(() => {
		setMounted(true)
	}, [])

	// Calculate initial adjusted position to prevent overflow
	const adjustedPosition = useMemo(() => {
		if (!position) {
			return null
		}

		const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0
		const viewportHeight =
			typeof window !== 'undefined' ? window.innerHeight : 0

		let adjustedX = position.x
		let adjustedY = position.y

		// Check right edge overflow
		if (adjustedX + MENU_WIDTH > viewportWidth - VIEWPORT_MARGIN) {
			// Flip to the left of the click position
			adjustedX = position.x - MENU_WIDTH
			// Ensure it doesn't go off the left edge
			if (adjustedX < MIN_EDGE_DISTANCE) {
				adjustedX = MIN_EDGE_DISTANCE
			}
		}

		// Check bottom edge overflow
		if (adjustedY + ESTIMATED_MENU_HEIGHT > viewportHeight - VIEWPORT_MARGIN) {
			// Flip above the click position
			adjustedY = position.y - ESTIMATED_MENU_HEIGHT
			// Ensure it doesn't go off the top edge
			if (adjustedY < MIN_EDGE_DISTANCE) {
				adjustedY = MIN_EDGE_DISTANCE
			}
		}

		// Ensure minimum distance from left edge
		if (adjustedX < MIN_EDGE_DISTANCE) {
			adjustedX = MIN_EDGE_DISTANCE
		}

		// Ensure minimum distance from top edge
		if (adjustedY < MIN_EDGE_DISTANCE) {
			adjustedY = MIN_EDGE_DISTANCE
		}

		return { x: adjustedX, y: adjustedY }
	}, [position])

	// Refine position after menu is measured (runs synchronously before paint)
	const [finalPosition, setFinalPosition] = useState(adjustedPosition)

	// Update finalPosition when adjustedPosition changes
	useEffect(() => {
		setFinalPosition(adjustedPosition)
	}, [adjustedPosition])

	useLayoutEffect(() => {
		if (!(menuRef.current && position && adjustedPosition)) {
			return
		}

		const menuRect = menuRef.current.getBoundingClientRect()
		const viewportWidth = window.innerWidth
		const viewportHeight = window.innerHeight

		let adjustedX = position.x
		let adjustedY = position.y

		// Check right edge overflow with actual dimensions
		if (adjustedX + menuRect.width > viewportWidth - VIEWPORT_MARGIN) {
			adjustedX = position.x - menuRect.width
			if (adjustedX < MIN_EDGE_DISTANCE) {
				adjustedX = MIN_EDGE_DISTANCE
			}
		}

		// Check bottom edge overflow with actual dimensions
		if (adjustedY + menuRect.height > viewportHeight - VIEWPORT_MARGIN) {
			adjustedY = position.y - menuRect.height
			if (adjustedY < MIN_EDGE_DISTANCE) {
				adjustedY = MIN_EDGE_DISTANCE
			}
		}

		// Ensure minimum distance from edges
		if (adjustedX < MIN_EDGE_DISTANCE) {
			adjustedX = MIN_EDGE_DISTANCE
		}
		if (adjustedY < MIN_EDGE_DISTANCE) {
			adjustedY = MIN_EDGE_DISTANCE
		}

		const newPosition = { x: adjustedX, y: adjustedY }
		// Only update if position changed significantly from adjustedPosition
		if (
			Math.abs(newPosition.x - adjustedPosition.x) > 1 ||
			Math.abs(newPosition.y - adjustedPosition.y) > 1
		) {
			setFinalPosition(newPosition)
		}
	}, [position, adjustedPosition])

	useEffect(() => {
		const handleClickOutside = () => {
			onClose()
		}

		const handleEscape = (e: Event) => {
			if ((e as KeyboardEvent).key === 'Escape') {
				onClose()
			}
		}

		// Prevent browser's native context menu when our custom menu is open
		const handleContextMenu = (e: MouseEvent) => {
			// Allow right-click on the menu itself (for potential future features)
			const target = e.target as HTMLElement
			if (menuRef.current?.contains(target)) {
				e.preventDefault()
				e.stopPropagation()
				return
			}

			// Prevent browser menu and close our menu if right-clicking elsewhere
			e.preventDefault()
			e.stopPropagation()
			onClose()
		}

		if (event && position) {
			document.addEventListener('click', handleClickOutside)
			document.addEventListener('keydown', handleEscape)
			document.addEventListener('contextmenu', handleContextMenu, true) // Use capture phase

			return () => {
				document.removeEventListener('click', handleClickOutside)
				document.removeEventListener('keydown', handleEscape)
				document.removeEventListener('contextmenu', handleContextMenu, true)
			}
		}

		return () => {
			// No cleanup needed when event/position are not available
		}
	}, [event, position, onClose])

	if (!mounted) {
		return null
	}

	// Precompute flags safely (guarded by optional chaining)
	const isConversation = (event?.extendedProps as { type?: number })?.type === 2
	const isReservation = (event?.extendedProps as { type?: number })?.type !== 2
	const isCancelled = Boolean(
		(event?.extendedProps as { cancelled?: boolean })?.cancelled
	)
	// const isEditable = event?.editable !== false;
	const isPast = event ? new Date(event.start) < new Date() : false

	const formatEventTime = (dateStr: string) => {
		const date = new Date(dateStr)
		return date.toLocaleTimeString(isLocalized ? 'ar-SA' : 'en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true,
		})
	}

	const formatEventDate = (dateStr: string) => {
		const date = new Date(dateStr)
		return date.toLocaleDateString(isLocalized ? 'ar-SA' : 'en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
		})
	}

	const displayPosition = finalPosition ?? adjustedPosition ?? position

	return createPortal(
		<AnimatePresence>
			{event && position && displayPosition && (
				<>
					{/* Outside click overlay */}
					<motion.div
						animate={{ opacity: 1 }}
						className="fixed inset-0"
						exit={{ opacity: 0 }}
						initial={{ opacity: 0 }}
						key="context-menu-overlay"
						onClick={() => onClose()}
						onContextMenu={(e) => {
							e.preventDefault()
							e.stopPropagation()
							onClose()
						}}
						style={{
							zIndex: 'var(--z-grid-menu-minus-1)',
							background: 'transparent',
						}}
						transition={{ duration: 0.1 }}
					/>

					{/* Animated context menu */}
					<motion.div
						animate={{ opacity: 1, scale: 1, y: 0 }}
						className="no-scrollbar w-[310px] rounded-2xl bg-gray-50 p-0 dark:bg-black/90"
						exit={{ opacity: 0, scale: 0.98, y: 2 }}
						initial={{ opacity: 0, scale: 0.96, y: 6 }}
						key="context-menu"
						onClick={(e) => e.stopPropagation()}
						onContextMenu={(e) => {
							e.preventDefault()
							e.stopPropagation()
						}}
						onKeyDown={(e) => {
							if (e.key === 'Escape') {
								e.stopPropagation()
							}
						}}
						ref={menuRef}
						role="menu"
						style={{
							position: 'fixed',
							left: displayPosition.x,
							top: displayPosition.y,
							zIndex: 'var(--z-grid-menu)',
							transformOrigin: 'top left',
						}}
						transition={{ duration: 0.14, ease: 'easeOut' }}
					>
						<section className="rounded-2xl border border-gray-200 bg-white p-1 shadow backdrop-blur-lg dark:border-gray-700/20 dark:bg-gray-100/10">
							<div className="flex items-center p-2">
								<div className="flex flex-1 items-center gap-2">
									{isConversation ? (
										<MessageCircle className="h-5 w-5 text-orange-500" />
									) : (
										<Calendar className="h-5 w-5 text-blue-500" />
									)}
									<div>
										<h3 className="max-w-[240px] truncate font-semibold text-gray-900 text-sm dark:text-gray-100">
											{String(event.title)}
										</h3>
										<div className="flex items-center gap-1 text-muted-foreground text-xs">
											<Clock className="h-3 w-3" />
											{formatEventDate(String(event.start))} •{' '}
											{formatEventTime(String(event.start))}
										</div>
									</div>
								</div>
							</div>

							<div className="-mx-1 my-1 h-px bg-border" />

							{isReservation && (
								<div className="p-1">
									<div
										className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
										onClick={() => {
											const waId =
												event?.extendedProps?.wa_id ||
												event?.extendedProps?.waId ||
												event?.id
											onOpenDocument?.(String(waId))
											onClose()
										}}
										onKeyDown={(e) => {
											if (e.key === 'Enter' || e.key === ' ') {
												e.preventDefault()
												const waId =
													event?.extendedProps?.wa_id ||
													event?.extendedProps?.waId ||
													event?.id
												onOpenDocument?.(String(waId))
												onClose()
											}
										}}
										role="menuitem"
										tabIndex={0}
									>
										<FileText className="h-4 w-4" />
										{i18n.getMessage('open_document', isLocalized)}
									</div>
									{!(isCancelled || isPast) && (
										<>
											<div className="-mx-1 my-1 h-px bg-border" />
											<div
												className="flex cursor-pointer items-center justify-between rounded-lg p-2 text-red-600 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
												onClick={() => {
													onCancelReservation?.(String(event.id))
													onClose()
												}}
												onKeyDown={(e) => {
													if (e.key === 'Enter' || e.key === ' ') {
														e.preventDefault()
														onCancelReservation?.(String(event.id))
														onClose()
													}
												}}
												role="menuitem"
												tabIndex={0}
											>
												<div className="flex items-center gap-1.5 font-medium">
													<CalendarX className="h-4 w-4" />
													{i18n.getMessage('cancel_reservation', isLocalized)}
												</div>
											</div>
										</>
									)}

									{isCancelled && (
										<>
											<div className="-mx-1 my-1 h-px bg-border" />
											<div className="flex items-center gap-2 px-2 py-1.5 font-semibold text-muted-foreground text-sm">
												<CalendarX className="h-4 w-4" />
												{i18n.getMessage('cancelled_reservation', isLocalized)}
											</div>
										</>
									)}

									{isPast && !isCancelled && (
										<>
											<div className="-mx-1 my-1 h-px bg-border" />
											<div className="flex items-center gap-2 px-2 py-1.5 font-semibold text-muted-foreground text-sm">
												<Clock className="h-4 w-4" />
												{i18n.getMessage('past_reservation', isLocalized)}
											</div>
										</>
									)}
								</div>
							)}

							{isConversation && (
								<div
									className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
									onClick={() => {
										onOpenConversation?.(String(event.id))
										onClose()
									}}
									onKeyDown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault()
											onOpenConversation?.(String(event.id))
											onClose()
										}
									}}
									role="menuitem"
									tabIndex={0}
								>
									<MessageCircle className="h-4 w-4" />
									{i18n.getMessage('open_conversation', isLocalized)}
								</div>
							)}
						</section>
					</motion.div>
				</>
			)}
		</AnimatePresence>,
		document.body
	)
}
