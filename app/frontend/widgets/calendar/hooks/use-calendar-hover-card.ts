import { useCallback, useEffect, useRef, useState } from "react";

// Constants for timing delays
const ANIMATION_DURATION = 500;
const INACTIVITY_TIMEOUT = 3000;
const HOVER_CARD_DELAY = 1500;
const BRIDGE_MOVE_TIMEOUT = 1000;
const BRIDGE_EXPANSION = 20;
const AWAY_FROM_CARD_THRESHOLD = 30;
const EVENT_PADDING = 20;
const CARD_PADDING = 30;
const CARD_WIDTH = 300;
const CARD_HEIGHT = 250;
const HOVER_CARD_CLOSE_DELAY = 1000;

type HoverCardPosition = {
	x: number;
	y: number;
	preferBottom?: boolean;
	eventHeight?: number;
};

type UseCalendarHoverCardProps = {
	isDragging: boolean;
};

export function useCalendarHoverCard({
	isDragging,
}: UseCalendarHoverCardProps) {
	const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
	const [hoverCardPosition, setHoverCardPosition] =
		useState<HoverCardPosition | null>(null);
	const [hoverTimer, setHoverTimer] = useState<NodeJS.Timeout | null>(null);
	const [closeTimer, setCloseTimer] = useState<NodeJS.Timeout | null>(null);
	const [isHoverCardClosing, setIsHoverCardClosing] = useState(false);
	const [isHoveringCard, setIsHoveringCard] = useState(false);
	const [isHoverCardMounted, setIsHoverCardMounted] = useState(false);
	const [inactivityTimer, setInactivityTimer] = useState<NodeJS.Timeout | null>(
		null
	);
	const [isMovingToCard, setIsMovingToCard] = useState(false);
	const [eventRect, setEventRect] = useState<DOMRect | null>(null);
	const lastMousePosition = useRef({ x: 0, y: 0 });
	const isHoveringCardRef = useRef(false);

	// Keep ref in sync with state
	useEffect(() => {
		isHoveringCardRef.current = isHoveringCard;
	}, [isHoveringCard]);

	// Helper to close hover card immediately
	const closeHoverCardImmediately = useCallback(() => {
		// Clear all timers
		if (hoverTimer) {
			clearTimeout(hoverTimer);
			setHoverTimer(null);
		}
		if (closeTimer) {
			clearTimeout(closeTimer);
			setCloseTimer(null);
		}
		if (inactivityTimer) {
			clearTimeout(inactivityTimer);
			setInactivityTimer(null);
		}

		// Close hover card without animation
		setHoveredEventId(null);
		setHoverCardPosition(null);
		setIsHoverCardClosing(false);
		setIsHoverCardMounted(false);
		setEventRect(null);
		setIsMovingToCard(false);
	}, [closeTimer, hoverTimer, inactivityTimer]);

	// Reset inactivity timer whenever there's interaction
	const resetInactivityTimer = useCallback(() => {
		// Don't set inactivity timer if hovering the card
		if (isHoveringCardRef.current) {
			return;
		}

		if (inactivityTimer) {
			clearTimeout(inactivityTimer);
		}

		// Set a new timer for 3 seconds of inactivity
		const timer = setTimeout(() => {
			if (hoveredEventId && !isHoveringCardRef.current) {
				// Check if mouse is still on the event before closing
				if (eventRect) {
					const mouseX = lastMousePosition.current.x;
					const mouseY = lastMousePosition.current.y;

					const isStillOnEvent =
						mouseX >= eventRect.left &&
						mouseX <= eventRect.right &&
						mouseY >= eventRect.top &&
						mouseY <= eventRect.bottom;

					// Don't close if still hovering the event
					if (isStillOnEvent) {
						return;
					}
				}

				setIsHoverCardClosing(true);

				setTimeout(() => {
					setHoveredEventId(null);
					setHoverCardPosition(null);
					setIsHoverCardClosing(false);
					setIsHoverCardMounted(false);
					setEventRect(null);
				}, ANIMATION_DURATION);
			}
		}, INACTIVITY_TIMEOUT);

		setInactivityTimer(timer);
	}, [inactivityTimer, hoveredEventId, eventRect]);

	// Helper to get card position based on viewport and event rect
	const getCardPosition = useCallback((rect: DOMRect) => {
		const viewportWidth = window.innerWidth;
		const cardHeight = 250;
		const cardWidth = 300;

		const spaceAbove = rect.top;
		const preferBottom = spaceAbove < cardHeight;

		let xPosition = rect.left + rect.width / 2;
		const halfCardWidth = cardWidth / 2;
		if (xPosition - halfCardWidth < 0) {
			xPosition = halfCardWidth;
		} else if (xPosition + halfCardWidth > viewportWidth) {
			xPosition = viewportWidth - halfCardWidth;
		}

		return {
			x: xPosition,
			y: preferBottom ? rect.bottom : rect.top,
			preferBottom,
			eventHeight: rect.height,
		};
	}, []);

	// Helper to check if should suppress hover card during drag
	const shouldShowHoverCard = useCallback(
		(
			isDrag: boolean,
			isMoving: boolean,
			currentHoveredId: string | null,
			incomingWaId: string
		): boolean => {
			if (isDrag || isMoving) {
				return false;
			}
			if (currentHoveredId && currentHoveredId !== incomingWaId) {
				return false;
			}
			return true;
		},
		[]
	);

	// Handle event mouse enter
	const handleEventMouseEnter = useCallback(
		(info: { event?: unknown; el: HTMLElement; jsEvent?: MouseEvent }) => {
			const event = info.event as
				| { id?: string; extendedProps?: Record<string, unknown> }
				| undefined;
			const el = info.el;

			// Don't show hover card while dragging
			if (isDragging) {
				return;
			}

			// Update mouse position from the event
			if (info.jsEvent) {
				lastMousePosition.current = {
					x: info.jsEvent.clientX,
					y: info.jsEvent.clientY,
				};
			}

			// If we're moving to the card, don't interfere
			if (isMovingToCard) {
				return;
			}

			// Helper to clear all timers
			const clearAllTimers = () => {
				if (inactivityTimer) {
					clearTimeout(inactivityTimer);
					setInactivityTimer(null);
				}
				if (hoverTimer) {
					clearTimeout(hoverTimer);
				}
				if (closeTimer) {
					clearTimeout(closeTimer);
					setCloseTimer(null);
				}
			};

			clearAllTimers();

			// Cancel any closing animation
			if (isHoverCardClosing) {
				setIsHoverCardClosing(false);
			}

			// Check incoming event ID
			const incomingWaId = String(
				event?.extendedProps?.waId ||
					event?.extendedProps?.wa_id ||
					event?.id ||
					""
			);

			// Validate we should show this card
			if (
				!shouldShowHoverCard(
					isDragging,
					isMovingToCard,
					hoveredEventId,
					incomingWaId
				)
			) {
				return;
			}

			// If no card is shown, set a timer to show it after delay
			if (!hoveredEventId) {
				const timer = setTimeout(() => {
					if (isDragging) {
						return;
					}

					const rect = el.getBoundingClientRect();
					const position = getCardPosition(rect);
					const waId = String(
						event?.extendedProps?.waId ||
							event?.extendedProps?.wa_id ||
							event?.id ||
							""
					);
					setHoveredEventId(waId || null);
					setHoverCardPosition(position);
					setIsHoverCardClosing(false);
					setIsHoverCardMounted(false);
					setEventRect(rect);
				}, HOVER_CARD_DELAY);

				setHoverTimer(timer);
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
			getCardPosition,
			shouldShowHoverCard,
		]
	);

	// Handle event mouse leave
	const handleEventMouseLeave = useCallback(
		(info: { event?: unknown }) => {
			const event = info.event as
				| { id?: string; extendedProps?: Record<string, unknown> }
				| undefined;

			// Clear timer if it exists
			if (hoverTimer) {
				clearTimeout(hoverTimer);
				setHoverTimer(null);
			}

			// If leaving the currently hovered event, set moving to card state
			const currentWaId = String(
				event?.extendedProps?.waId ||
					event?.extendedProps?.wa_id ||
					event?.id ||
					""
			);
			if (hoveredEventId === currentWaId && hoverCardPosition) {
				setIsMovingToCard(true);

				// Set a timer to clear the moving state if user doesn't reach the card
				const moveTimer = setTimeout(() => {
					setIsMovingToCard(false);
					// If not hovering the card, start close process
					if (!isHoveringCardRef.current) {
						resetInactivityTimer();
					}
				}, BRIDGE_MOVE_TIMEOUT); // 1 second to reach the card

				setCloseTimer(moveTimer);
			}
		},
		[hoverTimer, hoveredEventId, hoverCardPosition, resetInactivityTimer]
	);

	// Set hover card as mounted after it appears
	useEffect(() => {
		if (hoveredEventId && hoverCardPosition && !isHoverCardClosing) {
			// Use requestAnimationFrame to ensure the initial render happens first
			requestAnimationFrame(() => {
				setIsHoverCardMounted(true);
			});
		}
	}, [hoveredEventId, hoverCardPosition, isHoverCardClosing]);

	// Helper to check if mouse is in bridge area between event and card
	const isInBridge = useCallback(
		(
			e: MouseEvent,
			eventR: DOMRect | null,
			cardPos: HoverCardPosition | null
		): boolean => {
			if (!(eventR && cardPos)) {
				return false;
			}

			const cardLeft = cardPos.x - CARD_WIDTH / 2;
			const cardRight = cardPos.x + CARD_WIDTH / 2;
			const cardTop = cardPos.preferBottom
				? cardPos.y
				: cardPos.y - CARD_HEIGHT;
			const cardBottom = cardPos.preferBottom
				? cardPos.y + CARD_HEIGHT
				: cardPos.y;

			if (cardPos.preferBottom) {
				const bridgeTop = eventR.bottom;
				const bridgeBottom = cardTop;
				const bridgeLeft = Math.min(eventR.left, cardLeft) - BRIDGE_EXPANSION;
				const bridgeRight =
					Math.max(eventR.right, cardRight) + BRIDGE_EXPANSION;

				return (
					e.clientX >= bridgeLeft &&
					e.clientX <= bridgeRight &&
					e.clientY >= bridgeTop &&
					e.clientY <= bridgeBottom
				);
			}

			const bridgeTop = cardBottom;
			const bridgeBottom = eventR.top;
			const bridgeLeft = Math.min(eventR.left, cardLeft) - BRIDGE_EXPANSION;
			const bridgeRight = Math.max(eventR.right, cardRight) + BRIDGE_EXPANSION;

			return (
				e.clientX >= bridgeLeft &&
				e.clientX <= bridgeRight &&
				e.clientY >= bridgeTop &&
				e.clientY <= bridgeBottom
			);
		},
		[]
	);

	// Helper to check if mouse is near the card
	const isNearCard = useCallback(
		(e: MouseEvent, cardPos: HoverCardPosition): boolean => {
			const cardLeft = cardPos.x - CARD_WIDTH / 2;
			const cardRight = cardPos.x + CARD_WIDTH / 2;
			const cardTop = cardPos.preferBottom
				? cardPos.y
				: cardPos.y - CARD_HEIGHT;
			const cardBottom = cardPos.preferBottom
				? cardPos.y + CARD_HEIGHT
				: cardPos.y;

			return (
				e.clientX >= cardLeft - CARD_PADDING &&
				e.clientX <= cardRight + CARD_PADDING &&
				e.clientY >= cardTop - CARD_PADDING &&
				e.clientY <= cardBottom + CARD_PADDING
			);
		},
		[]
	);

	// Helper to check if mouse moved away from card
	const isMovingAway = useCallback(
		(
			e: MouseEvent,
			eventR: DOMRect | null,
			cardPos: HoverCardPosition | null
		): boolean => {
			if (!(eventR && cardPos)) {
				return false;
			}

			if (cardPos.preferBottom) {
				return e.clientY < eventR.top - AWAY_FROM_CARD_THRESHOLD;
			}
			return e.clientY > eventR.bottom + AWAY_FROM_CARD_THRESHOLD;
		},
		[]
	);

	// Global mouse move handler
	const setupMouseMoveHandler = useCallback(() => {
		if (!(hoveredEventId && hoverCardPosition)) {
			return;
		}

		const handleGlobalMouseMove = (e: MouseEvent) => {
			lastMousePosition.current = { x: e.clientX, y: e.clientY };

			if (isHoveringCardRef.current) {
				return;
			}

			const isNearEvent =
				eventRect &&
				e.clientX >= eventRect.left - EVENT_PADDING &&
				e.clientX <= eventRect.right + EVENT_PADDING &&
				e.clientY >= eventRect.top - EVENT_PADDING &&
				e.clientY <= eventRect.bottom + EVENT_PADDING;

			const inBridge = isInBridge(e, eventRect, hoverCardPosition);
			const nearCard = isNearCard(e, hoverCardPosition);
			const movingAwayFromCard = isMovingAway(e, eventRect, hoverCardPosition);

			if (!(nearCard || isNearEvent || inBridge) || movingAwayFromCard) {
				setIsMovingToCard(false);
				setIsHoverCardClosing(true);
				setTimeout(() => {
					setHoveredEventId(null);
					setHoverCardPosition(null);
					setIsHoverCardClosing(false);
					setIsHoverCardMounted(false);
					setEventRect(null);
				}, ANIMATION_DURATION);
			}
		};

		document.addEventListener("mousemove", handleGlobalMouseMove);

		return () => {
			document.removeEventListener("mousemove", handleGlobalMouseMove);
		};
	}, [
		hoveredEventId,
		hoverCardPosition,
		eventRect,
		isInBridge,
		isNearCard,
		isMovingAway,
	]);

	// Global scroll handler
	const handleScroll = useCallback(() => {
		closeHoverCardImmediately();
	}, [closeHoverCardImmediately]);

	// Set up mouse move and scroll handlers
	useEffect(() => {
		if (!(hoveredEventId && hoverCardPosition)) {
			return;
		}

		const removeMouseListener = setupMouseMoveHandler();

		window.addEventListener("scroll", handleScroll, true);
		document.addEventListener("scroll", handleScroll, true);

		return () => {
			removeMouseListener?.();
			window.removeEventListener("scroll", handleScroll, true);
			document.removeEventListener("scroll", handleScroll, true);
		};
	}, [hoveredEventId, hoverCardPosition, handleScroll, setupMouseMoveHandler]);

	// Cleanup timers on unmount
	useEffect(
		() => () => {
			if (hoverTimer) {
				clearTimeout(hoverTimer);
			}
			if (closeTimer) {
				clearTimeout(closeTimer);
			}
			if (inactivityTimer) {
				clearTimeout(inactivityTimer);
			}
		},
		[hoverTimer, closeTimer, inactivityTimer]
	);

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
			setIsHoveringCard(true);
			setIsMovingToCard(false); // Successfully reached the card
			// Cancel any timers
			if (closeTimer) {
				clearTimeout(closeTimer);
				setCloseTimer(null);
			}
			if (inactivityTimer) {
				clearTimeout(inactivityTimer);
				setInactivityTimer(null);
			}
			setIsHoverCardClosing(false);
		}, [closeTimer, inactivityTimer]),
		onHoverCardMouseLeave: useCallback(() => {
			setIsHoveringCard(false);
			// Start close timer when leaving the card
			const timer = setTimeout(() => {
				if (!isHoveringCard) {
					setIsHoverCardClosing(true);

					setTimeout(() => {
						setHoveredEventId(null);
						setHoverCardPosition(null);
						setIsHoverCardClosing(false);
						setIsHoverCardMounted(false);
						setEventRect(null);
					}, ANIMATION_DURATION);
				}
			}, HOVER_CARD_CLOSE_DELAY); // 1 second delay before closing

			setCloseTimer(timer);
		}, [isHoveringCard]),
	};
}
