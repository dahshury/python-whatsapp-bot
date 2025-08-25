"use client";

import { BlurFade } from "@/components/magicui/blur-fade";

interface CalendarSkeletonProps {
	isBlurred?: boolean;
	children?: React.ReactNode;
}

export function CalendarSkeleton({
	isBlurred = false,
	children,
}: CalendarSkeletonProps) {
	if (isBlurred && children) {
		// Show blurred version of the actual calendar
		return (
			<BlurFade duration={0.3} blur="8px" direction="down" className="relative">
				<div className="relative">
					{/* Blurred calendar content */}
					<div className="filter blur-sm opacity-70 pointer-events-none select-none">
						{children}
					</div>

					{/* Overlay with subtle loading indicator */}
					<div className="absolute inset-0 bg-background/20 backdrop-blur-sm flex items-center justify-center">
						<div className="flex items-center space-x-2 text-muted-foreground">
							<div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
							<span className="text-sm">Updating...</span>
						</div>
					</div>
				</div>
			</BlurFade>
		);
	}

	// Fallback skeleton for initial loading
	return (
		<BlurFade duration={0.4} delay={0.1} direction="down">
			<div className="w-full h-[800px] bg-card rounded-lg border">
				<div className="p-4">
					{/* Calendar header skeleton */}
					<div className="flex items-center justify-between mb-6">
						<div className="flex items-center space-x-4">
							<div className="h-8 w-32 bg-muted animate-pulse rounded" />
							<div className="h-8 w-20 bg-muted animate-pulse rounded" />
						</div>
						<div className="flex items-center space-x-2">
							<div className="h-8 w-8 bg-muted animate-pulse rounded" />
							<div className="h-8 w-8 bg-muted animate-pulse rounded" />
							<div className="h-8 w-20 bg-muted animate-pulse rounded" />
						</div>
					</div>

					{/* Calendar grid skeleton */}
					<div className="grid grid-cols-7 gap-2 mb-4">
						{Array.from({ length: 7 }).map((_, i) => (
							<div
								key={`skh-${i}`}
								className="h-8 bg-muted animate-pulse rounded text-center"
							/>
						))}
					</div>

					{/* Calendar days skeleton */}
					<div className="grid grid-cols-7 gap-2">
						{Array.from({ length: 35 }).map((_, i) => (
							<div
								key={`sk-${i}`}
								className="h-20 bg-muted animate-pulse rounded relative"
							>
								{/* Random event-like blocks */}
								{i % 5 === 0 && (
									<div className="absolute top-1 left-1 right-1 h-4 bg-primary/20 animate-pulse rounded-sm" />
								)}
								{i % 7 === 0 && (
									<div className="absolute top-6 left-1 right-1 h-4 bg-secondary/20 animate-pulse rounded-sm" />
								)}
							</div>
						))}
					</div>
				</div>
			</div>
		</BlurFade>
	);
}

export default CalendarSkeleton;
