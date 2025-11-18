'use client'

import { useKeyboardRepeatNavigation } from '@shared/libs/hooks/use-keyboard-repeat-navigation'
import { useLongPressRepeat } from '@shared/libs/hooks/use-long-press-repeat'
import { i18n } from '@shared/libs/i18n'
import { Button } from '@ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import React from 'react'
import type { NavigationControlsProps } from '@/features/navigation/types'
import { ButtonGroup } from '@/shared/ui/button-group'
import { useSidebar } from '@/shared/ui/sidebar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'

export const NavigationControls = React.memo(
	function NavigationControlsComponent({
		isLocalized = false,
		isCalendarPage = false,
		isPrevDisabled = false,
		isNextDisabled = false,
		onPrev = () => {
			// Intentional no-op default handler
		},
		onNext = () => {
			// Intentional no-op default handler
		},
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
		// Button sizing based on compact mode
		const buttonSize = compact ? 'icon-sm' : 'icon'
		const iconSize = compact ? 'size-4' : 'size-4 sm:size-5'

		return (
			<ButtonGroup className={className}>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							data-slot="dock-prev"
							disabled={isCalendarPage && isPrevDisabled}
							onClick={onPrev}
							size={buttonSize}
							variant="outline"
							{...prevHoldHandlers}
						>
							<ChevronLeft className={iconSize} />
						</Button>
					</TooltipTrigger>
					<TooltipContent>
						<p>{i18n.getMessage('msg_previous', isLocalized)}</p>
					</TooltipContent>
				</Tooltip>

				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							data-slot="dock-next"
							disabled={isCalendarPage && isNextDisabled}
							onClick={onNext}
							size={buttonSize}
							variant="outline"
							{...nextHoldHandlers}
						>
							<ChevronRight className={iconSize} />
						</Button>
					</TooltipTrigger>
					<TooltipContent>
						<p>{i18n.getMessage('msg_next', isLocalized)}</p>
					</TooltipContent>
				</Tooltip>
			</ButtonGroup>
		)
	}
)
