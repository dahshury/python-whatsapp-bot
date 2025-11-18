'use client'

import { useFitTextScale } from '@shared/libs/hooks/use-fit-text-scale'
import { i18n } from '@shared/libs/i18n'
import { cn } from '@shared/libs/utils'
import { Button } from '@ui/button'
import { CalendarDays } from 'lucide-react'
import {
	memo,
	useCallback,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import type { NavigationDateButtonProps } from '@/features/navigation/types'
// Spinner removed per design: no loading indicator behind settings/date
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'
import { EventCountBadgePortal } from './event-count-badge-portal'

// Badge padding constants (in pixels)
const BADGE_PADDING_LARGE = 56 // For counts > 99 (icon + "99+" + margins)
const BADGE_PADDING_SMALL = 44 // For counts <= 99 (icon + number + margins)
// Breakpoint widths (in pixels)
const BREAKPOINT_SM = 640
const BREAKPOINT_MD = 768
// Minimum width constants for different screen sizes (in pixels)
const MIN_WIDTH_XS = 320 // <sm screens
const MIN_WIDTH_SM = 420 // sm-md screens
const MIN_WIDTH_MD = 560 // >=md screens
const MIN_WIDTH_FALLBACK = 420 // Fallback minimum width
// Badge allowance constants (in pixels)
const BADGE_ALLOWANCE_LARGE = 42 // For counts > 99
const BADGE_ALLOWANCE_SMALL = 32 // For counts <= 99
// Layout cushion for locale variations and hover transitions (in pixels)
const LAYOUT_CUSHION = 16
// Text scale constants for useFitTextScale
const MIN_SCALE_NAVIGATION_ONLY = 0.7
const MIN_SCALE_DEFAULT = 0.75
const MAX_SCALE_NAVIGATION_ONLY = 1.8
const MAX_SCALE_DEFAULT = 1.5
// Default window width fallback (in pixels)
const DEFAULT_WINDOW_WIDTH_PX = 1280
// Padding and line-height constants
const PADDING_RIGHT_BASE_PX = 24
const LINE_HEIGHT_NAVIGATION_ONLY = 1.1
// Badge count threshold
const BADGE_COUNT_THRESHOLD = 99

export const NavigationDateButton = memo(
	({
		title,
		isLocalized = false,
		isCalendarPage: _isCalendarPage = false,
		isTodayDisabled = false,
		onToday,
		navigationOnly = false,
		className = '',
		visibleEventCount,
		showBadge = true,
	}: NavigationDateButtonProps) => {
		const [isHoveringDate, setIsHoveringDate] = useState(false)
		const anchorRef = useRef<HTMLSpanElement | null>(null)
		const { containerRef, contentRef, fontSizePx } = useFitTextScale({
			// Allow text to grow up to fill the reserved width in drawer, keep downscale reasonable
			minScale: navigationOnly ? MIN_SCALE_NAVIGATION_ONLY : MIN_SCALE_DEFAULT,
			maxScale: navigationOnly ? MAX_SCALE_NAVIGATION_ONLY : MAX_SCALE_DEFAULT,
			paddingPx: 0,
		})

		// Reserve space on the right side of the text so the floating event badge
		// never visually collides with the title text, even when the title scales up.
		const reservedBadgePaddingPx = useMemo(() => {
			if (!showBadge) {
				return 0
			}
			const count =
				typeof visibleEventCount === 'number' ? visibleEventCount : 0
			if (count <= 0) {
				return 0
			}
			// Room for icon + "99+" + margins inside the button
			return count > BADGE_COUNT_THRESHOLD
				? BADGE_PADDING_LARGE
				: BADGE_PADDING_SMALL
		}, [showBadge, visibleEventCount])

		// Dynamically compute a comfortable min-width for the title button based on
		// measured text width, current font, and container padding. This prevents the
		// title from over-squeezing when month range strings are long (especially in RTL locales).
		const [minWidthPx, setMinWidthPx] = useState<number | undefined>(undefined)

		const computeFallbackMin = useCallback(() => {
			// Conservative baseline to avoid flicker before first measurement
			try {
				const w =
					typeof window !== 'undefined'
						? window.innerWidth
						: DEFAULT_WINDOW_WIDTH_PX
				if (w < BREAKPOINT_SM) {
					return MIN_WIDTH_XS
				}
				if (w < BREAKPOINT_MD) {
					return MIN_WIDTH_SM
				}
				return MIN_WIDTH_MD
			} catch {
				return MIN_WIDTH_FALLBACK
			}
		}, [])

		const recomputeMinWidth = useCallback(() => {
			// In drawer (navigationOnly) we still want to reserve space like on calendar page
			const wantsMinWidth = _isCalendarPage || !navigationOnly
			if (!wantsMinWidth) {
				setMinWidthPx(undefined)
				return
			}
			try {
				const text = (title || '').trim()
				if (!text) {
					setMinWidthPx(computeFallbackMin())
					return
				}

				const contentEl = contentRef.current as HTMLElement | null
				const containerEl = containerRef.current as HTMLElement | null
				if (!(contentEl && containerEl)) {
					setMinWidthPx(computeFallbackMin())
					return
				}

				// Resolve effective font to measure accurately
				const cs = window.getComputedStyle(contentEl)
				const font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
				const canvas = document.createElement('canvas')
				const ctx = canvas.getContext('2d')
				if (!ctx) {
					setMinWidthPx(computeFallbackMin())
					return
				}
				ctx.font = font
				const measured = ctx.measureText(text).width

				const ccs = window.getComputedStyle(containerEl)
				const padL = Number.parseFloat(ccs.paddingLeft || '0') || 0
				const padR = Number.parseFloat(ccs.paddingRight || '0') || 0

				// Allowance for the event badge when visible (worst case 99+)
				let badgeAllowance = 0
				if (showBadge && visibleEventCount) {
					badgeAllowance =
						visibleEventCount > BADGE_COUNT_THRESHOLD
							? BADGE_ALLOWANCE_LARGE
							: BADGE_ALLOWANCE_SMALL
				}
				// Small cushion to accommodate locale variations and hover transitions
				const cushion = LAYOUT_CUSHION

				const computed = Math.ceil(
					measured + padL + padR + badgeAllowance + cushion
				)
				// Ensure we never dip below a sensible baseline
				const fallback = computeFallbackMin()
				setMinWidthPx(Math.max(computed, fallback))
			} catch {
				setMinWidthPx(computeFallbackMin())
			}
		}, [
			_isCalendarPage,
			navigationOnly,
			title,
			showBadge,
			visibleEventCount,
			contentRef,
			containerRef,
			computeFallbackMin,
		])

		// Recompute when title or font scale changes, or on resize/orientation changes
		useLayoutEffect(() => {
			recomputeMinWidth()
			const onResize = () => recomputeMinWidth()
			window.addEventListener('resize', onResize)
			window.addEventListener('orientationchange', onResize)
			return () => {
				window.removeEventListener('resize', onResize)
				window.removeEventListener('orientationchange', onResize)
			}
		}, [recomputeMinWidth])

		let width: string
		if (_isCalendarPage) {
			width = 'max-w-[min(95vw,120rem)]'
		} else {
			// In drawer/navigation mode, fill available width
			width = navigationOnly ? 'w-full max-w-full' : 'w-auto max-w-full'
		}
		const textSize = navigationOnly
			? 'text-[0.95rem] sm:text-lg'
			: 'text-[1.05rem] sm:text-xl md:text-2xl'
		// removed loader sizing; spinner is no longer used

		const button = (
			<Button
				className={cn(
					'group relative h-9 max-w-full overflow-visible rounded-full',
					'hover:bg-accent hover:text-accent-foreground',
					'transition-all duration-200',
					!isTodayDisabled && 'cursor-pointer',
					width,
					className,
					// In navigation mode, allow shrinking but ensure it can expand
					navigationOnly ? 'min-w-0' : undefined
				)}
				disabled={isTodayDisabled}
				onClick={onToday}
				onMouseEnter={() => setIsHoveringDate(true)}
				onMouseLeave={() => setIsHoveringDate(false)}
				size="sm"
				style={{
					minWidth:
						(_isCalendarPage || !navigationOnly) && minWidthPx
							? `${minWidthPx}px`
							: undefined,
				}}
				variant="ghost"
			>
				<span
					className="pointer-events-none absolute top-0 right-0 h-0 w-0"
					ref={anchorRef}
				/>
				<span
					className={cn(
						'absolute inset-0 z-10 flex items-center justify-center transition-all duration-200',
						isHoveringDate && !isTodayDisabled
							? 'scale-75 opacity-0'
							: 'scale-100 opacity-100'
					)}
				>
					<div
						className={cn(
							'w-full min-w-0 max-w-full overflow-hidden text-center',
							navigationOnly ? 'px-4 sm:px-6' : 'px-6'
						)}
						ref={containerRef}
						style={{
							// Override right padding to ensure badge overlay area is text-free
							paddingRight:
								reservedBadgePaddingPx > 0
									? `${PADDING_RIGHT_BASE_PX + reservedBadgePaddingPx}px`
									: undefined,
						}}
					>
						<span
							className={cn(
								textSize,
								'inline-block whitespace-nowrap font-medium'
							)}
							ref={contentRef}
							style={{
								fontSize: fontSizePx ? `${fontSizePx}px` : undefined,
								// Only adjust line-height in drawer to help vertical centering
								lineHeight: navigationOnly
									? LINE_HEIGHT_NAVIGATION_ONLY
									: undefined,
							}}
						>
							{title}
						</span>
					</div>
				</span>

				<span
					className={cn(
						'absolute inset-0 z-20 flex items-center justify-center transition-all duration-200',
						isHoveringDate && !isTodayDisabled
							? 'scale-100 opacity-100'
							: 'scale-75 opacity-0'
					)}
				>
					<CalendarDays className="size-4 sm:size-5" />
				</span>
				{showBadge && (
					<EventCountBadgePortal
						anchorRef={anchorRef}
						count={visibleEventCount}
						isLocalized={isLocalized}
					/>
				)}
			</Button>
		)

		// Only show tooltip if today is not already shown
		if (isTodayDisabled) {
			return button
		}

		return (
			<Tooltip>
				<TooltipTrigger asChild>{button}</TooltipTrigger>
				<TooltipContent>
					<p className="flex items-center gap-1.5">
						<CalendarDays className="h-3.5 w-3.5" />
						{i18n.getMessage('go_to_today', isLocalized)}
						<span className="text-muted-foreground text-xs">({title})</span>
					</p>
				</TooltipContent>
			</Tooltip>
		)
	}
)
