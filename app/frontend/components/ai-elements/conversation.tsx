'use client'

import { AnimatePresence, motion } from 'framer-motion'
import React, {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from 'react'
import { cn } from '@/shared/libs/utils'

const SCROLL_BOTTOM_EPSILON_PX = 8
const FLOATING_BUTTON_ANIMATION_DURATION = 0.16
const FLOATING_BUTTON_EASE_X1 = 0.45
const FLOATING_BUTTON_EASE_Y1 = 0
const FLOATING_BUTTON_EASE_X2 = 0.55
const FLOATING_BUTTON_EASE_Y2 = 1
const FLOATING_BUTTON_ANIMATION_EASE: [number, number, number, number] = [
	FLOATING_BUTTON_EASE_X1,
	FLOATING_BUTTON_EASE_Y1,
	FLOATING_BUTTON_EASE_X2,
	FLOATING_BUTTON_EASE_Y2,
]
const SMOOTH_SCROLL_CHECK_DELAY_MS = 300
const INSTANT_SCROLL_CHECK_DELAY_MS = 50
const CONTENT_HEIGHT_CHANGE_CHECK_DELAY_MS = 100
const SCROLL_STOP_CHECK_DELAY_MS = 150
const INITIAL_SCROLL_CHECK_DELAY_MS = 100
const INITIAL_SCROLL_CHECK_LONG_DELAY_MS = 300
const SCROLLER_FIND_DELAY_SHORT_MS = 100
const SCROLLER_FIND_DELAY_LONG_MS = 500

type StickToBottomContext = {
	isAtBottom: boolean
	scrollToBottom: () => void
	checkIfAtBottom: () => void
	setScrollerReady: (ready: boolean) => void
	contentRef: React.RefObject<HTMLDivElement | null>
	scrollerRef: React.RefObject<HTMLElement | null>
}

const StickToBottomContext = createContext<StickToBottomContext | null>(null)

const useStickToBottom = () => {
	const context = useContext(StickToBottomContext)
	if (!context) {
		throw new Error(
			'useStickToBottom must be used within a Conversation component'
		)
	}
	return context
}

type ConversationProps = React.HTMLAttributes<HTMLDivElement> & {
	contextRef?: React.Ref<StickToBottomContext>
	instance?: {
		scrollToBottom: () => void
	}
	children?:
		| ((context: StickToBottomContext) => React.ReactNode)
		| React.ReactNode
}

export const Conversation: React.FC<ConversationProps> = ({
	children,
	className,
	contextRef,
	instance,
	...props
}) => {
	const [isAtBottom, setIsAtBottom] = useState(true)
	const [scrollerReady, setScrollerReady] = useState(false)
	const contentRef = useRef<HTMLDivElement>(null)
	const scrollerRef = useRef<HTMLElement>(null)
	const lastContentHeightRef = useRef<number>(0)
	const isUserScrollingRef = useRef(false)
	const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	const scrollListenerCleanupRef = useRef<(() => void) | null>(null)

	const checkIfAtBottom = useCallback(() => {
		const scroller = scrollerRef.current
		if (!scroller) {
			return
		}

		const scrollTop = scroller.scrollTop
		const scrollHeight = scroller.scrollHeight
		const clientHeight = scroller.clientHeight
		const distanceFromBottom = Math.max(
			0,
			scrollHeight - clientHeight - scrollTop
		)
		const atBottom = distanceFromBottom <= SCROLL_BOTTOM_EPSILON_PX
		setIsAtBottom(atBottom)
	}, [])

	const scrollToBottom = useCallback(
		(behavior: ScrollBehavior = 'smooth') => {
			const scroller = scrollerRef.current
			if (scroller) {
				scroller.scrollTo({
					top: scroller.scrollHeight,
					behavior,
				})
				// Check if we're at bottom after scrolling completes
				if (behavior === 'smooth') {
					// For smooth scroll, wait for it to complete
					setTimeout(() => {
						checkIfAtBottom()
					}, SMOOTH_SCROLL_CHECK_DELAY_MS)
				} else {
					// For instant scroll, check immediately
					requestAnimationFrame(() => {
						checkIfAtBottom()
					})
				}
			} else {
				// Fallback: try to find scrollable element via contentRef
				const content = contentRef.current
				if (content) {
					const scrollableParent = content.closest(
						'.ScrollbarsCustom-Scroller'
					) as HTMLElement | null
					if (scrollableParent) {
						scrollableParent.scrollTo({
							top: scrollableParent.scrollHeight,
							behavior,
						})
						// Check after scrolling
						setTimeout(
							() => {
								checkIfAtBottom()
							},
							behavior === 'smooth'
								? SMOOTH_SCROLL_CHECK_DELAY_MS
								: INSTANT_SCROLL_CHECK_DELAY_MS
						)
					}
				}
			}
		},
		[checkIfAtBottom]
	)

	// Auto-scroll when content height changes (new messages added)
	useEffect(() => {
		const scroller = scrollerRef.current
		if (!scroller) {
			return
		}

		const observer = new ResizeObserver(() => {
			const currentHeight = scroller.scrollHeight
			const heightChanged = currentHeight !== lastContentHeightRef.current
			lastContentHeightRef.current = currentHeight

			if (heightChanged && isAtBottom && !isUserScrollingRef.current) {
				// Auto-scroll to bottom when new content is added and user is at bottom
				requestAnimationFrame(() => {
					scrollToBottom('smooth')
					// Check if we're at bottom after scrolling
					setTimeout(() => {
						checkIfAtBottom()
					}, CONTENT_HEIGHT_CHANGE_CHECK_DELAY_MS)
				})
			} else if (heightChanged) {
				// Even if user isn't at bottom, check position after content changes
				requestAnimationFrame(() => {
					checkIfAtBottom()
				})
			}
		})

		observer.observe(scroller)

		return () => {
			observer.disconnect()
		}
	}, [isAtBottom, scrollToBottom, checkIfAtBottom])

	// Track scroll events to detect user scrolling
	useEffect(() => {
		const scroller = scrollerRef.current
		if (!(scroller && scrollerReady)) {
			return
		}

		// Clean up previous listener if any
		if (scrollListenerCleanupRef.current) {
			scrollListenerCleanupRef.current()
			scrollListenerCleanupRef.current = null
		}

		const handleScroll = () => {
			isUserScrollingRef.current = true
			checkIfAtBottom()

			// Clear existing timeout
			if (scrollTimeoutRef.current) {
				clearTimeout(scrollTimeoutRef.current)
			}

			// Reset user scrolling flag after scroll stops
			scrollTimeoutRef.current = setTimeout(() => {
				isUserScrollingRef.current = false
				// Final check after scroll stops to ensure accurate state
				checkIfAtBottom()
			}, SCROLL_STOP_CHECK_DELAY_MS)
		}

		const handleScrollEnd = () => {
			// Check when scroll ends (if browser supports scrollend event)
			checkIfAtBottom()
		}

		scroller.addEventListener('scroll', handleScroll, { passive: true })

		// Use scrollend event if available (modern browsers)
		if ('onscrollend' in scroller) {
			scroller.addEventListener('scrollend', handleScrollEnd, {
				passive: true,
			})
		}

		// Run initial check when scroller is attached
		checkIfAtBottom()

		scrollListenerCleanupRef.current = () => {
			scroller.removeEventListener('scroll', handleScroll)
			if ('onscrollend' in scroller) {
				scroller.removeEventListener('scrollend', handleScrollEnd)
			}
			if (scrollTimeoutRef.current) {
				clearTimeout(scrollTimeoutRef.current)
			}
		}

		return () => {
			if (scrollListenerCleanupRef.current) {
				scrollListenerCleanupRef.current()
				scrollListenerCleanupRef.current = null
			}
		}
	}, [checkIfAtBottom, scrollerReady])

	// Initial scroll to bottom and check
	useEffect(() => {
		const scroller = scrollerRef.current
		if (scroller && scrollerReady) {
			requestAnimationFrame(() => {
				scrollToBottom('auto')
				// Check after scrolling to set correct state
				setTimeout(() => {
					checkIfAtBottom()
				}, INITIAL_SCROLL_CHECK_DELAY_MS)
				// Also check after a longer delay to ensure scroll completed
				setTimeout(() => {
					checkIfAtBottom()
				}, INITIAL_SCROLL_CHECK_LONG_DELAY_MS)
			})
		}
	}, [scrollToBottom, checkIfAtBottom, scrollerReady])

	const contextValue: StickToBottomContext = React.useMemo(
		() => ({
			isAtBottom,
			scrollToBottom: () => scrollToBottom('smooth'),
			checkIfAtBottom,
			setScrollerReady,
			contentRef,
			scrollerRef,
		}),
		[isAtBottom, scrollToBottom, checkIfAtBottom]
	)

	// Expose context via ref if provided
	useEffect(() => {
		if (contextRef) {
			if (typeof contextRef === 'function') {
				contextRef(contextValue)
			} else {
				;(contextRef as React.MutableRefObject<StickToBottomContext>).current =
					contextValue
			}
		}
	}, [contextRef, contextValue])

	// Expose instance methods if provided
	useEffect(() => {
		if (instance) {
			instance.scrollToBottom = () => scrollToBottom('smooth')
		}
	}, [instance, scrollToBottom])

	const renderChildren = () => {
		if (typeof children === 'function') {
			return children(contextValue)
		}
		return children
	}

	return (
		<StickToBottomContext.Provider value={contextValue}>
			<div
				className={cn('relative flex h-full flex-col gap-3', className)}
				data-ai-element="conversation"
				{...props}
			>
				{renderChildren()}
			</div>
		</StickToBottomContext.Provider>
	)
}

type ConversationContentProps = React.HTMLAttributes<HTMLDivElement> & {
	children?:
		| ((context: StickToBottomContext) => React.ReactNode)
		| React.ReactNode
}

export const ConversationContent = ({
	children,
	className: contentClassName,
	ref,
	...props
}: ConversationContentProps & {
	ref?: React.RefObject<HTMLDivElement | null>
}) => {
	const context = useStickToBottom()

	// Set scroller ref when content mounts and when ThemedScrollbar renders
	useEffect(() => {
		const findScroller = () => {
			const contentElement =
				ref && typeof ref !== 'function' ? ref.current : null
			if (!contentElement) {
				return
			}

			// ThemedScrollbar creates a .ScrollbarsCustom-Scroller element inside ConversationContent
			// We need to find it within the content element's subtree
			const scroller = contentElement.querySelector(
				'.ScrollbarsCustom-Scroller'
			) as HTMLElement | null

			if (scroller) {
				const previousScroller = context.scrollerRef.current
				context.scrollerRef.current = scroller

				// If this is a new scroller, mark it as ready and trigger checks
				if (previousScroller !== scroller) {
					context.setScrollerReady(true)
					// Trigger initial check to set the correct state
					requestAnimationFrame(() => {
						context.checkIfAtBottom()
					})
					setTimeout(() => {
						context.checkIfAtBottom()
					}, CONTENT_HEIGHT_CHANGE_CHECK_DELAY_MS)
				}
				return
			}

			// Fallback: check if content element itself is scrollable
			if (contentElement.scrollHeight > contentElement.clientHeight) {
				context.scrollerRef.current = contentElement
			}
		}

		// Try immediately
		findScroller()

		// Also try after delays to catch async rendering (ThemedScrollbar SSR)
		const timeoutId1 = setTimeout(findScroller, SCROLLER_FIND_DELAY_SHORT_MS)
		const timeoutId2 = setTimeout(findScroller, SCROLLER_FIND_DELAY_LONG_MS)

		// Use MutationObserver to detect when ThemedScrollbar mounts
		const observer = new MutationObserver(() => {
			findScroller()
		})

		const contentElement = ref && typeof ref !== 'function' ? ref.current : null
		if (contentElement) {
			observer.observe(contentElement, {
				childList: true,
				subtree: true,
			})
		}

		return () => {
			clearTimeout(timeoutId1)
			clearTimeout(timeoutId2)
			observer.disconnect()
		}
	}, [ref, context])

	const renderChildren = () => {
		if (typeof children === 'function') {
			return children(context)
		}
		return children
	}

	return (
		<div
			className={cn('relative flex-1 overflow-hidden', contentClassName)}
			data-ai-element="conversation-content"
			ref={ref}
			{...props}
		>
			{renderChildren()}
		</div>
	)
}

export const ConversationEmptyState: React.FC<
	React.HTMLAttributes<HTMLDivElement> & {
		title?: string
		description?: string
		icon?: React.ReactNode
	}
> = ({
	title = 'No messages yet',
	description = 'Start a conversation to see messages here',
	icon,
	className,
	children,
	...props
}) => (
	<div
		className={cn(
			'flex flex-col items-center justify-center gap-4 py-12 text-center',
			className
		)}
		{...props}
	>
		{icon && <div className="text-muted-foreground">{icon}</div>}
		<div className="space-y-2">
			<h3 className="font-medium text-sm">{title}</h3>
			<p className="text-muted-foreground text-xs">{description}</p>
		</div>
		{children}
	</div>
)

type ConversationScrollButtonProps =
	React.ButtonHTMLAttributes<HTMLButtonElement> & {
		bottomOffset?: string
	}

export const ConversationScrollButton: React.FC<
	ConversationScrollButtonProps
> = ({ className, children, bottomOffset = '0.5rem', ...props }) => {
	const { isAtBottom, scrollToBottom } = useStickToBottom()

	return (
		<AnimatePresence>
			{!isAtBottom && (
				<motion.div
					animate={{ opacity: 1, y: 0, scale: 1 }}
					className="pointer-events-none absolute right-4 z-50"
					exit={{ opacity: 0, y: 8, scale: 0.95 }}
					initial={{ opacity: 0, y: 8, scale: 0.95 }}
					style={{
						bottom: bottomOffset,
					}}
					transition={{
						duration: FLOATING_BUTTON_ANIMATION_DURATION,
						ease: FLOATING_BUTTON_ANIMATION_EASE,
					}}
				>
					<button
						className={cn(
							'pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
							className
						)}
						data-ai-element="conversation-scroll-button"
						onClick={scrollToBottom}
						type="button"
						{...props}
					>
						{children || (
							<svg
								aria-hidden="true"
								className="h-4 w-4"
								fill="currentColor"
								viewBox="0 0 24 24"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path d="M12 16a1 1 0 0 1-.707-.293l-6-6a1 1 0 1 1 1.414-1.414L12 13.586l5.293-5.293a1 1 0 0 1 1.414 1.414l-6 6A1 1 0 0 1 12 16Z" />
							</svg>
						)}
					</button>
				</motion.div>
			)}
		</AnimatePresence>
	)
}

// Export the hook for advanced usage
export { useStickToBottom }
