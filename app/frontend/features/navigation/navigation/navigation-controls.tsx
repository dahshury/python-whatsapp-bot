'use client'

import { useKeyboardRepeatNavigation } from '@shared/libs/hooks/use-keyboard-repeat-navigation'
import { useLongPressRepeat } from '@shared/libs/hooks/use-long-press-repeat'
import { i18n } from '@shared/libs/i18n'
import { Button } from '@ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import React from 'react'
import type { NavigationControlsProps } from '@/features/navigation/types'
import { DockIcon } from '@/shared/ui/dock'
import { useSidebar } from '@/shared/ui/sidebar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'

export const NavigationControls = React.memo(function NavigationControls({
	isLocalized = false,
	isCalendarPage = false,
	isPrevDisabled = false,
	isNextDisabled = false,
	onPrev = () => {},
	onNext = () => {},
	className = '',
	compact = false,
}: NavigationControlsProps) {
	const { open, openMobile } = useSidebar()
	const prevHoldHandlers = useLongPressRepeat(onPrev, {
		startDelayMs: 2000,
		intervalMs: 333,
		disabled: isCalendarPage && isPrevDisabled,
	})
	const nextHoldHandlers = useLongPressRepeat(onNext, {
		startDelayMs: 2000,
		intervalMs: 333,
		disabled: isCalendarPage && isNextDisabled,
	})

	useKeyboardRepeatNavigation({
		onLeft: onPrev,
		onRight: onNext,
		disabledLeft: isCalendarPage && isPrevDisabled,
		disabledRight: isCalendarPage && isNextDisabled,
		startDelayMs: 2000,
		intervalMs: 333,
		isSidebarOpen: open || openMobile,
	})
	// Enlarge clickable area and add subtle theme-aware styling (sizes are handled by Dock defaults for SSR safety)

	const buttonHeight = compact ? 'h-8' : 'h-9 sm:h-10'
	const iconSize = compact ? 'size-4' : 'size-4 sm:size-5'

	const prevButton = (
		<DockIcon
			className="transition-colors"
			paddingPx={0}
			widthScale={1.4}
			{...prevHoldHandlers}
		>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						className={`${buttonHeight} flex w-full items-center justify-center rounded-theme border border-border/40 bg-background/40 shadow-sm transition-all duration-200 hover:bg-accent/60 hover:text-accent-foreground`}
						data-slot="dock-prev"
						disabled={isCalendarPage && isPrevDisabled}
						onClick={onPrev}
						size="icon"
						variant="ghost"
						{...prevHoldHandlers}
					>
						<ChevronLeft className={iconSize} />
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					<p>{i18n.getMessage('msg_previous', isLocalized)}</p>
				</TooltipContent>
			</Tooltip>
		</DockIcon>
	)

	const nextButton = (
		<DockIcon
			className="transition-colors"
			paddingPx={0}
			widthScale={1.4}
			{...nextHoldHandlers}
		>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						className={`${buttonHeight} flex w-full items-center justify-center rounded-theme border border-border/40 bg-background/40 shadow-sm transition-all duration-200 hover:bg-accent/60 hover:text-accent-foreground`}
						data-slot="dock-next"
						disabled={isCalendarPage && isNextDisabled}
						onClick={onNext}
						size="icon"
						variant="ghost"
						{...nextHoldHandlers}
					>
						<ChevronRight className={iconSize} />
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					<p>{i18n.getMessage('msg_next', isLocalized)}</p>
				</TooltipContent>
			</Tooltip>
		</DockIcon>
	)

	return (
		<div className={`flex items-center gap-0.5 ${className}`}>
			{prevButton}
			{nextButton}
		</div>
	)
})
