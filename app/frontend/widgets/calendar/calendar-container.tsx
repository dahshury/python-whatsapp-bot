"use client";

import type React from "react";
import { CalendarSkeleton } from "./calendar-skeleton";

type CalendarContainerProps = {
	loading: boolean;
	isHydrated: boolean;
	isRefreshing: boolean;
	children: React.ReactNode;
};

export function CalendarContainer({
	loading,
	isHydrated,
	isRefreshing,
	children,
}: CalendarContainerProps) {
	// Show loading state
	if (loading || !isHydrated) {
		return <CalendarSkeleton />;
	}

	const content = (
		<div
			className="calendar-bg-wrap relative w-full"
			style={{
				// Make FC internal sticky backgrounds use transparency so glow shows through
				// @ts-expect-error -- CSS variable custom property
				"--fc-page-bg-color": "transparent",
			}}
		>
			<div className="relative z-10">{children}</div>
			<style jsx>
				{`
				/* Ensure the radial glow is visible through FullCalendar */
				.calendar-bg-wrap :global(.fc) {
					background-color: transparent;
				}
				.calendar-bg-wrap :global(.fc-scrollgrid-section-sticky > *) {
					background: transparent;
				}
				.calendar-bg-wrap :global(.fc .fc-view-harness),
				.calendar-bg-wrap :global(.fc .fc-view),
				.calendar-bg-wrap :global(.fc .fc-scrollgrid),
				.calendar-bg-wrap :global(.fc .fc-scrollgrid table),
				.calendar-bg-wrap :global(.fc .fc-scrollgrid-section),
				.calendar-bg-wrap :global(.fc .fc-scrollgrid-section > *),
				.calendar-bg-wrap :global(.fc .fc-scrollgrid-section-header > *),
				.calendar-bg-wrap :global(.fc .fc-scrollgrid-section-body > *),
				.calendar-bg-wrap :global(.fc .fc-scrollgrid-section-footer > *),
				.calendar-bg-wrap :global(.fc .fc-daygrid),
				.calendar-bg-wrap :global(.fc .fc-daygrid-bg),
				.calendar-bg-wrap :global(.fc .fc-timegrid),
				.calendar-bg-wrap :global(.fc .fc-timegrid-slots),
				.calendar-bg-wrap :global(.fc th),
				.calendar-bg-wrap :global(.fc td) {
					background: transparent;
					background-color: transparent;
				}
				/* Also paint glow on scrollgrid to cover cases where harness isn't filling */
				.calendar-bg-wrap :global(.fc .fc-scrollgrid) {
					background-image:
						radial-gradient(
							ellipse 110% 85% at 50% 18%,
							hsl(var(--muted-foreground) / 0.06) 0%,
							hsl(var(--muted-foreground) / 0.03) 28%,
							hsl(var(--muted-foreground) / 0.015) 40%,
							transparent 68%
						),
						radial-gradient(ellipse 90% 60% at 50% 85%, hsl(var(--muted-foreground) / 0.018) 0%, transparent 42%);
					background-color: hsl(var(--background));
					background-repeat: no-repeat;
					background-size: 100% 100%;
				}
				/* Apply the subtle radial glow directly on the view harness (under events) */
				.calendar-bg-wrap :global(.fc .fc-view-harness) {
					background:
						radial-gradient(
							ellipse 110% 85% at 50% 18%,
							hsl(var(--muted-foreground) / 0.06) 0%,
							hsl(var(--muted-foreground) / 0.03) 28%,
							hsl(var(--muted-foreground) / 0.015) 40%,
							transparent 68%
						),
						radial-gradient(ellipse 90% 60% at 50% 85%, hsl(var(--muted-foreground) / 0.018) 0%, transparent 42%),
						hsl(var(--background));
					background-repeat: no-repeat;
					background-size: 100% 100%;
				}
			`}
			</style>
		</div>
	);

	// Show blurred calendar when refreshing
	if (isRefreshing) {
		return <CalendarSkeleton isBlurred={true}>{content}</CalendarSkeleton>;
	}

	return content;
}
