'use client'

import { BlurFade } from '@/shared/ui/magicui/blur-fade'
import { Spinner } from '@/shared/ui/spinner'

const SKELETON_EVENT_FREQUENCY_PRIMARY = 5
const SKELETON_EVENT_FREQUENCY_SECONDARY = 7

type CalendarSkeletonProps = {
	isBlurred?: boolean
	children?: React.ReactNode
}

export function CalendarSkeleton({
	isBlurred = false,
	children,
}: CalendarSkeletonProps) {
	// Prevent potential re-render loops by only rendering blurred children once
	if (isBlurred && children) {
		// Show blurred version of the actual calendar
		return (
			<BlurFade blur="8px" className="relative" direction="down" duration={0.3}>
				<div className="relative">
					{/* Blurred calendar content */}
					<div className="pointer-events-none select-none opacity-70 blur-sm filter">
						{children}
					</div>

					{/* Overlay with subtle loading indicator */}
					<div className="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-sm">
						<div className="flex items-center space-x-2 text-muted-foreground">
							<Spinner className="size-4" />
							<span className="text-sm">Updating...</span>
						</div>
					</div>
				</div>
			</BlurFade>
		)
	}

	// Fallback skeleton for initial loading
	return (
		<BlurFade delay={0.1} direction="down" duration={0.4}>
			<div className="h-[50rem] w-full rounded-lg border bg-card">
				<div className="p-4">
					{/* Calendar header skeleton */}
					<div className="mb-6 flex items-center justify-between">
						<div className="flex items-center space-x-4">
							<div className="h-8 w-32 animate-pulse rounded bg-muted" />
							<div className="h-8 w-20 animate-pulse rounded bg-muted" />
						</div>
						<div className="flex items-center space-x-2">
							<div className="h-8 w-8 animate-pulse rounded bg-muted" />
							<div className="h-8 w-8 animate-pulse rounded bg-muted" />
							<div className="h-8 w-20 animate-pulse rounded bg-muted" />
						</div>
					</div>

					{/* Calendar grid skeleton */}
					<div className="mb-4 grid grid-cols-7 gap-2">
						{['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => (
							<div
								className="h-8 animate-pulse rounded bg-muted text-center"
								key={`skeleton-header-${day}`}
							/>
						))}
					</div>

					{/* Calendar days skeleton */}
					<div className="grid grid-cols-7 gap-2">
						{Array.from({ length: 35 }, (_, i) => `day-${i + 1}`).map(
							(dayId, index) => (
								<div
									className="relative h-20 animate-pulse rounded bg-muted"
									key={`skeleton-${dayId}`}
								>
									{/* Random event-like blocks */}
									{index % SKELETON_EVENT_FREQUENCY_PRIMARY === 0 && (
										<div className="absolute top-1 right-1 left-1 h-4 animate-pulse rounded-sm bg-primary/20" />
									)}
									{index % SKELETON_EVENT_FREQUENCY_SECONDARY === 0 && (
										<div className="absolute top-6 right-1 left-1 h-4 animate-pulse rounded-sm bg-secondary/20" />
									)}
								</div>
							)
						)}
					</div>
				</div>
			</div>
		</BlurFade>
	)
}
