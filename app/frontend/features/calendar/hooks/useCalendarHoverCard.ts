import { useCallback, useEffect, useRef, useState } from 'react'

// Timer constants for hover card interactions
const ANIMATION_DURATION_MS = 500
const INACTIVITY_TIMEOUT_MS = 3000 // 3 seconds
const INITIAL_SHOW_DELAY_MS = 1500 // 1.5 seconds
const REACH_CARD_TIMEOUT_MS = 1000 // 1 second
const BRIDGE_AREA_PADDING = 20
const CARD_PADDING = 30
const MOVING_AWAY_THRESHOLD = 30

type HoverCardPosition = {
	x: number
	y: number
	preferBottom?: boolean
	eventHeight?: number
}

type UseCalendarHoverCardProps = {
	isDragging: boolean
}

export function useCalendarHoverCard({
	isDragging,
}: UseCalendarHoverCardProps) {
	const [hoveredEventId, setHoveredEventId] = useState<string | null>(null)
	const [hoverCardPosition, setHoverCardPosition] =
		useState<HoverCardPosition | null>(null)
	const [hoverTimer, setHoverTimer] = useState<NodeJS.Timeout | null>(null)
	const [closeTimer, setCloseTimer] = useState<NodeJS.Timeout | null>(null)
	const [isHoverCardClosing, setIsHoverCardClosing] = useState(false)
	const [isHoveringCard, setIsHoveringCard] = useState(false)
	const [isHoverCardMounted, setIsHoverCardMounted] = useState(false)
	const [inactivityTimer, setInactivityTimer] = useState<NodeJS.Timeout | null>(
		null
	)
	const [isMovingToCard, setIsMovingToCard] = useState(false)
	const [eventRect, setEventRect] = useState<DOMRect | null>(null)
	const lastMousePosition = useRef({ x: 0, y: 0 })
	const isHoveringCardRef = useRef(false)

	// Keep ref in sync with state
	useEffect(() => {
		isHoveringCardRef.current = isHoveringCard
	}, [isHoveringCard])

	// Helper to close hover card immediately
	const closeHoverCardImmediately = useCallback(() => {
		// Clear all timers
		if (hoverTimer) {
			clearTimeout(hoverTimer)
			setHoverTimer(null)
		}
		if (closeTimer) {
			clearTimeout(closeTimer)
			setCloseTimer(null)
		}
		if (inactivityTimer) {
			clearTimeout(inactivityTimer)
			setInactivityTimer(null)
		}

		// Close hover card without animation
		setHoveredEventId(null)
		setHoverCardPosition(null)
		setIsHoverCardClosing(false)
		setIsHoverCardMounted(false)
		setEventRect(null)
		setIsMovingToCard(false)
	}, [closeTimer, hoverTimer, inactivityTimer])

	// Reset inactivity timer whenever there's interaction
	const resetInactivityTimer = useCallback(() => {
		// Don't set inactivity timer if hovering the card
		if (isHoveringCardRef.current) {
			return
		}

		if (inactivityTimer) {
			clearTimeout(inactivityTimer)
		}

		// Set a new timer for 3 seconds of inactivity
		const timer = setTimeout(() => {
			if (hoveredEventId && !isHoveringCardRef.current) {
				// Check if mouse is still on the event before closing
				if (eventRect) {
					const mouseX = lastMousePosition.current.x
					const mouseY = lastMousePosition.current.y

					const isStillOnEvent =
						mouseX >= eventRect.left &&
						mouseX <= eventRect.right &&
						mouseY >= eventRect.top &&
						mouseY <= eventRect.bottom

					// Don't close if still hovering the event
					if (isStillOnEvent) {
						return
					}
				}

				setIsHoverCardClosing(true)

				setTimeout(() => {
					setHoveredEventId(null)
					setHoverCardPosition(null)
					setIsHoverCardClosing(false)
					setIsHoverCardMounted(false)
					setEventRect(null)
				}, ANIMATION_DURATION_MS)
			}
		}, INACTIVITY_TIMEOUT_MS)

		setInactivityTimer(timer)
	}, [inactivityTimer, hoveredEventId, eventRect])

	// Handle event mouse enter
	const handleEventMouseEnter = useCallback(
		(info: { event?: unknown; el: HTMLElement; jsEvent?: MouseEvent }) => {
			const event = info.event as
				| { id?: string; extendedProps?: Record<string, unknown> }
				| undefined
			const el = info.el

			// Prevent vacation events from showing hover cards
			const extendedProps = event?.extendedProps as
				| { __vacation?: boolean; isVacationPeriod?: boolean }
				| undefined
			if (
				extendedProps?.__vacation === true ||
				extendedProps?.isVacationPeriod === true
			) {
				return
			}

			// Don't show hover card while dragging
			if (isDragging) {
				return
			}

			// Update mouse position from the event
			if (info.jsEvent) {
				lastMousePosition.current = {
					x: info.jsEvent.clientX,
					y: info.jsEvent.clientY,
				}
			}

			// If we're moving to the card, don't interfere
			if (isMovingToCard) {
				return
			}

			// Clear inactivity timer when hovering an event
			if (inactivityTimer) {
				clearTimeout(inactivityTimer)
				setInactivityTimer(null)
			}

			// Clear any existing timers
			if (hoverTimer) {
				clearTimeout(hoverTimer)
			}
			if (closeTimer) {
				clearTimeout(closeTimer)
				setCloseTimer(null)
			}

			// Cancel any closing animation
			if (isHoverCardClosing) {
				setIsHoverCardClosing(false)
			}

			// If we're hovering a different event and a card is already shown
			const incomingWaId = String(
				event?.extendedProps?.waId ||
					event?.extendedProps?.wa_id ||
					event?.id ||
					''
			)
			if (hoveredEventId && hoveredEventId !== incomingWaId) {
				// Don't immediately switch - user might be trying to reach the card
				return
			}

			// If no card is shown, set a timer to show it after delay
			if (!hoveredEventId) {
				const timer = setTimeout(() => {
					// Double-check we're not dragging
					if (isDragging) {
						return
					}

					const rect = el.getBoundingClientRect()
					const viewportWidth = window.innerWidth
					const cardHeight = 250
					const cardWidth = 300

					const spaceAbove = rect.top
					const preferBottom = spaceAbove < cardHeight

					let xPosition = rect.left + rect.width / 2
					const halfCardWidth = cardWidth / 2
					if (xPosition - halfCardWidth < 0) {
						xPosition = halfCardWidth
					} else if (xPosition + halfCardWidth > viewportWidth) {
						xPosition = viewportWidth - halfCardWidth
					}

					// Prefer WhatsApp identifier for customer lookup
					const waId = String(
						event?.extendedProps?.waId ||
							event?.extendedProps?.wa_id ||
							event?.id ||
							''
					)
					setHoveredEventId(waId || null)
					setHoverCardPosition({
						x: xPosition,
						y: preferBottom ? rect.bottom : rect.top,
						preferBottom,
						eventHeight: rect.height,
					})
					setIsHoverCardClosing(false)
					setIsHoverCardMounted(false)
					setEventRect(rect)
				}, INITIAL_SHOW_DELAY_MS)

				setHoverTimer(timer)
			}
		},
		[
			hoverTimer,
			closeTimer,
			isHoverCardClosing,
			hoveredEventId,
			isMovingToCard,
			inactivityTimer,
			isDragging,
		]
	)

	// Handle event mouse leave
	const handleEventMouseLeave = useCallback(
		(info: { event?: unknown }) => {
			const event = info.event as
				| { id?: string; extendedProps?: Record<string, unknown> }
				| undefined

			// Clear timer if it exists
			if (hoverTimer) {
				clearTimeout(hoverTimer)
				setHoverTimer(null)
			}

			// If leaving the currently hovered event, set moving to card state
			const currentWaId = String(
				event?.extendedProps?.waId ||
					event?.extendedProps?.wa_id ||
					event?.id ||
					''
			)
			if (hoveredEventId === currentWaId && hoverCardPosition) {
				setIsMovingToCard(true)

				// Set a timer to clear the moving state if user doesn't reach the card
				const moveTimer = setTimeout(() => {
					setIsMovingToCard(false)
					// If not hovering the card, start close process
					if (!isHoveringCardRef.current) {
						resetInactivityTimer()
					}
				}, REACH_CARD_TIMEOUT_MS)

				setCloseTimer(moveTimer)
			}
		},
		[hoverTimer, hoveredEventId, hoverCardPosition, resetInactivityTimer]
	)

	// Set hover card as mounted after it appears
	useEffect(() => {
		if (hoveredEventId && hoverCardPosition && !isHoverCardClosing) {
			// Use requestAnimationFrame to ensure the initial render happens first
			requestAnimationFrame(() => {
				setIsHoverCardMounted(true)
			})
		}
	}, [hoveredEventId, hoverCardPosition, isHoverCardClosing])

	// Global mouse move handler to detect when mouse moves far away
	useEffect(() => {
		if (!(hoveredEventId && hoverCardPosition)) {
			return
		}

		const handleGlobalMouseMove = (e: MouseEvent) => {
			// Update last mouse position
			lastMousePosition.current = { x: e.clientX, y: e.clientY }

			// Skip if we're hovering the card
			if (isHoveringCardRef.current) {
				return
			}

			// Calculate card boundaries
			const cardWidth = 300
			const cardHeight = 250
			const cardLeft = hoverCardPosition.x - cardWidth / 2
			const cardRight = hoverCardPosition.x + cardWidth / 2
			const cardTop = hoverCardPosition.preferBottom
				? hoverCardPosition.y
				: hoverCardPosition.y - cardHeight
			const cardBottom = hoverCardPosition.preferBottom
				? hoverCardPosition.y + cardHeight
				: hoverCardPosition.y

			// Check if near the event rect with minimal padding
			let isNearEvent = false
			if (eventRect) {
				const eventPadding = 20 // Reduced padding for tighter control
				isNearEvent =
					e.clientX >= eventRect.left - eventPadding &&
					e.clientX <= eventRect.right + eventPadding &&
					e.clientY >= eventRect.top - eventPadding &&
					e.clientY <= eventRect.bottom + eventPadding
			}

			// Create a smart bridge area between event and card
			let isInBridgeArea = false
			if (eventRect) {
				// Determine the bridge area based on card direction
				if (hoverCardPosition.preferBottom) {
					// Card spawned below - bridge should be between event bottom and card top
					const bridgeTop = eventRect.bottom
					const bridgeBottom = cardTop
					const bridgeLeft =
						Math.min(eventRect.left, cardLeft) - BRIDGE_AREA_PADDING
					const bridgeRight =
						Math.max(eventRect.right, cardRight) + BRIDGE_AREA_PADDING

					isInBridgeArea =
						e.clientX >= bridgeLeft &&
						e.clientX <= bridgeRight &&
						e.clientY >= bridgeTop &&
						e.clientY <= bridgeBottom
				} else {
					// Card spawned above - bridge should be between card bottom and event top
					const bridgeTop = cardBottom
					const bridgeBottom = eventRect.top
					const bridgeLeft =
						Math.min(eventRect.left, cardLeft) - BRIDGE_AREA_PADDING
					const bridgeRight =
						Math.max(eventRect.right, cardRight) + BRIDGE_AREA_PADDING

					isInBridgeArea =
						e.clientX >= bridgeLeft &&
						e.clientX <= bridgeRight &&
						e.clientY >= bridgeTop &&
						e.clientY <= bridgeBottom
				}
			}

			// Check if near the card with minimal padding
			const isNearCard =
				e.clientX >= cardLeft - CARD_PADDING &&
				e.clientX <= cardRight + CARD_PADDING &&
				e.clientY >= cardTop - CARD_PADDING &&
				e.clientY <= cardBottom + CARD_PADDING

			// Check if moving in the wrong direction (away from the card)
			let isMovingAwayFromCard = false
			if (eventRect) {
				if (hoverCardPosition.preferBottom) {
					// Card is below - moving up from event should close card
					isMovingAwayFromCard =
						e.clientY < eventRect.top - MOVING_AWAY_THRESHOLD
				} else {
					// Card is above - moving down from event should close card
					isMovingAwayFromCard =
						e.clientY > eventRect.bottom + MOVING_AWAY_THRESHOLD
				}
			}

			// Close the card if:
			// 1. Mouse is outside all valid areas (event, bridge, card)
			// 2. Mouse is moving in the wrong direction away from the card
			if (
				!(isNearCard || isNearEvent || isInBridgeArea) ||
				isMovingAwayFromCard
			) {
				setIsMovingToCard(false)
				// Start closing immediately
				setIsHoverCardClosing(true)
				setTimeout(() => {
					setHoveredEventId(null)
					setHoverCardPosition(null)
					setIsHoverCardClosing(false)
					setIsHoverCardMounted(false)
					setEventRect(null)
				}, ANIMATION_DURATION_MS)
			}
		}

		// Handle scroll events - hide hover card when scrolling
		const handleScroll = () => {
			// Immediately close the hover card when scrolling
			closeHoverCardImmediately()
		}

		document.addEventListener('mousemove', handleGlobalMouseMove)
		// Listen for scroll on both window and any scrollable containers
		window.addEventListener('scroll', handleScroll, true) // Use capture to catch all scroll events
		document.addEventListener('scroll', handleScroll, true)

		return () => {
			document.removeEventListener('mousemove', handleGlobalMouseMove)
			window.removeEventListener('scroll', handleScroll, true)
			document.removeEventListener('scroll', handleScroll, true)
		}
	}, [
		hoveredEventId,
		hoverCardPosition,
		eventRect, // Immediately close the hover card when scrolling
		closeHoverCardImmediately,
	])

	// Cleanup timers on unmount
	useEffect(
		() => () => {
			if (hoverTimer) {
				clearTimeout(hoverTimer)
			}
			if (closeTimer) {
				clearTimeout(closeTimer)
			}
			if (inactivityTimer) {
				clearTimeout(inactivityTimer)
			}
		},
		[hoverTimer, closeTimer, inactivityTimer]
	)

	return {
		hoveredEventId,
		hoverCardPosition,
		isHoverCardClosing,
		isHoverCardMounted,
		isHoveringCard,
		setIsHoveringCard,
		setIsMovingToCard,
		handleEventMouseEnter,
		handleEventMouseLeave,
		closeHoverCardImmediately,
		// Hover card event handlers for the portal
		onHoverCardMouseEnter: useCallback(() => {
			setIsHoveringCard(true)
			setIsMovingToCard(false) // Successfully reached the card
			// Cancel any timers
			if (closeTimer) {
				clearTimeout(closeTimer)
				setCloseTimer(null)
			}
			if (inactivityTimer) {
				clearTimeout(inactivityTimer)
				setInactivityTimer(null)
			}
			setIsHoverCardClosing(false)
		}, [closeTimer, inactivityTimer]),
		onHoverCardMouseLeave: useCallback(() => {
			setIsHoveringCard(false)
			// Start close timer when leaving the card
			const timer = setTimeout(() => {
				if (!isHoveringCard) {
					setIsHoverCardClosing(true)

					setTimeout(() => {
						setHoveredEventId(null)
						setHoverCardPosition(null)
						setIsHoverCardClosing(false)
						setIsHoverCardMounted(false)
						setEventRect(null)
					}, ANIMATION_DURATION_MS)
				}
			}, REACH_CARD_TIMEOUT_MS) // 1 second delay before closing

			setCloseTimer(timer)
		}, [isHoveringCard]),
	}
}
