'use client'

import { cn } from '@shared/libs/utils'
import { Button } from '@ui/button'
import { PanelLeft } from 'lucide-react'
import { useSidebar } from '@/shared/ui/sidebar'
import { CalendarLegend } from '@/widgets/calendar'

type AnimatedSidebarTriggerProps = {
	className?: string
	freeRoam?: boolean
}

export function AnimatedSidebarTrigger({
	className,
	freeRoam = false,
}: AnimatedSidebarTriggerProps) {
	const { toggleSidebar, open, isMobile } = useSidebar()

	return (
		<>
			{/* Trigger when sidebar is closed - positioned at left edge */}
			<Button
				aria-label="Open Sidebar"
				className={cn(
					'animated-sidebar-trigger fixed top-4 left-4 h-7 w-7 transition-all duration-300 ease-in-out',
					open
						? 'pointer-events-none scale-95 opacity-0'
						: 'pointer-events-auto scale-100 opacity-100',
					isMobile && 'md:hidden', // Hide on mobile since sheet handles it
					className
				)}
				onClick={toggleSidebar}
				size="icon"
				variant="ghost"
			>
				<PanelLeft className="h-4 w-4" />
			</Button>

			{/* Trigger when sidebar is open - positioned inside sidebar at header level */}
			<div
				className={cn(
					'animated-sidebar-trigger fixed top-4 transition-all duration-300 ease-in-out',
					open
						? 'pointer-events-auto opacity-100'
						: 'pointer-events-none opacity-0',
					isMobile && 'hidden' // Hide on mobile since sheet handles it
				)}
				style={{
					left: 'calc(var(--sidebar-width) - 3rem)',
					transform: open ? 'translateX(0)' : 'translateX(100%)',
				}}
			>
				<Button
					aria-label="Close Sidebar"
					className={cn('animated-sidebar-trigger h-7 w-7', className)}
					onClick={toggleSidebar}
					size="icon"
					variant="ghost"
				>
					<PanelLeft className="h-4 w-4 rotate-180" />
				</Button>
			</div>

			{/* Legend always stays outside sidebar, positioned beside closed trigger or outside open sidebar */}
			<div
				className={cn(
					'calendar-legend-trigger fixed top-4 transition-all duration-300 ease-in-out',
					isMobile && 'md:hidden' // Hide on mobile since sheet handles it
				)}
				style={{
					left: open ? 'calc(var(--sidebar-width) + 1rem)' : '4.5rem', // Outside sidebar when open, beside trigger when closed
				}}
			>
				<CalendarLegend className="h-7 w-auto" freeRoam={freeRoam} />
			</div>
		</>
	)
}
