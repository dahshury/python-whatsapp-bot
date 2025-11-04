'use client'

import { i18n } from '@shared/libs/i18n'
import { useLanguage } from '@shared/libs/state/language-context'
import { cn } from '@shared/libs/utils'
import { Button } from '@ui/button'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import type { RefObject } from 'react'
import { useState } from 'react'
import type { CalendarCoreRef } from '@/features/calendar'
import { useCalendarToolbar } from '@/features/calendar'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/shared/ui/tooltip'

type CalendarToolbarProps = {
	calendarRef?: RefObject<CalendarCoreRef | null> | null
	currentView: string
	freeRoam?: boolean
	className?: string
}

export function CalendarToolbar({
	calendarRef,
	currentView,
	className,
}: CalendarToolbarProps) {
	const { isLocalized } = useLanguage()
	const [isHoveringDate, setIsHoveringDate] = useState(false)

	// Use the custom hook for all calendar logic
	const {
		title,
		isPrevDisabled,
		isNextDisabled,
		isTodayDisabled,
		handlePrev,
		handleNext,
		handleToday,
	} = useCalendarToolbar({
		calendarRef: calendarRef || null,
		currentView,
	})

	// Define navigation buttons with proper arrow directions for RTL
	const prevButton = (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						className="h-16 w-16"
						disabled={isPrevDisabled}
						onClick={handlePrev}
						size="icon"
						variant="ghost"
					>
						{/* In RTL, use right arrow for previous (pointing outward) */}
						{isLocalized ? (
							<ChevronRight className="h-8 w-8" />
						) : (
							<ChevronLeft className="h-8 w-8" />
						)}
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					<p>{i18n.getMessage('msg_previous', isLocalized)}</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	)

	const nextButton = (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						className="h-16 w-16"
						disabled={isNextDisabled}
						onClick={handleNext}
						size="icon"
						variant="ghost"
					>
						{/* In RTL, use left arrow for next (pointing outward) */}
						{isLocalized ? (
							<ChevronLeft className="h-8 w-8" />
						) : (
							<ChevronRight className="h-8 w-8" />
						)}
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					<p>{i18n.getMessage('msg_next', isLocalized)}</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	)

	return (
		<div className={cn('flex items-center gap-2', className)}>
			{/* Navigation controls with date in the middle */}
			<div className="flex items-center">
				{/* Left side navigation button (Previous in LTR, Next in RTL) */}
				{isLocalized ? nextButton : prevButton}

				{/* Date text as clickable button to go to today */}
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								className={cn(
									'group relative mx-2 h-16 px-6 font-medium text-2xl',
									'hover:bg-accent hover:text-accent-foreground',
									'transition-all duration-200',
									!isTodayDisabled && 'cursor-pointer'
								)}
								disabled={isTodayDisabled}
								onClick={handleToday}
								onMouseEnter={() => setIsHoveringDate(true)}
								onMouseLeave={() => setIsHoveringDate(false)}
								size="sm"
								variant="ghost"
							>
								{/* Calendar icon that appears on hover */}
								<CalendarDays
									className={cn(
										'absolute h-7 w-7 transition-all duration-200',
										isLocalized ? 'right-2' : 'left-2',
										isHoveringDate && !isTodayDisabled
											? 'scale-100 opacity-100'
											: 'scale-75 opacity-0'
									)}
								/>

								{/* Date text with padding adjustment for icon */}
								<span
									className={cn(
										'transition-all duration-200',
										isHoveringDate &&
											!isTodayDisabled &&
											(isLocalized ? 'pr-10' : 'pl-10')
									)}
								>
									{title}
								</span>

								{/* Subtle underline indicator */}
								<span
									className={cn(
										'absolute right-6 bottom-2 left-6 h-0.5 scale-x-0 bg-current opacity-0',
										'origin-center transition-all duration-200',
										!isTodayDisabled &&
											'group-hover:scale-x-100 group-hover:opacity-20'
									)}
								/>

								{/* Today indicator dot when not showing today */}
								{!isTodayDisabled && (
									<span
										className={cn(
											'absolute top-1 h-3 w-3 rounded-full',
											'animate-pulse bg-primary',
											isLocalized ? 'left-1' : 'right-1'
										)}
									/>
								)}
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p className="flex items-center gap-1.5">
								{isTodayDisabled ? (
									i18n.getMessage('already_showing_today', isLocalized)
								) : (
									<>
										<CalendarDays className="h-3.5 w-3.5" />
										{i18n.getMessage('go_to_today', isLocalized)}
									</>
								)}
							</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>

				{/* Right side navigation button (Next in LTR, Previous in RTL) */}
				{isLocalized ? prevButton : nextButton}
			</div>
		</div>
	)
}

// Export view options for use in settings
export { getCalendarViewOptions } from '@/features/calendar'
