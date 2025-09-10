import { useCallback, useEffect, useState } from "react";
import type { CalendarCoreRef } from "@/components/calendar-core";

interface UseCalendarInitializationProps {
	calculateHeight: () => number | "auto";
	sidebarOpen?: boolean;
	refreshData: () => Promise<void>;
	calendarRef?: React.RefObject<CalendarCoreRef | null>;
}

export function useCalendarInitialization({
	calculateHeight,
	sidebarOpen: _sidebarOpen,
	refreshData,
}: UseCalendarInitializationProps) {
	const [calendarHeight, setCalendarHeight] = useState<number | "auto">(800);
	const [isRefreshing, setIsRefreshing] = useState(false);

	// Wrapper for refreshData that shows blur animation
	const handleRefreshWithBlur = useCallback(async () => {
		setIsRefreshing(true);
		try {
			await refreshData();
		} finally {
			// Small delay to ensure smooth transition
			setTimeout(() => setIsRefreshing(false), 300);
		}
	}, [refreshData]);

	// Vacation events are now managed through the main events array

	// Note: Conversations are already fetched by WebSocketDataProvider on mount
	// No need to fetch them again here

	// Set initial height and update on resize
	useEffect(() => {
		setCalendarHeight(calculateHeight());
	}, [calculateHeight]);

	// Smooth updateSize handler called on container resize frames
	const handleUpdateSize = useCallback(
		(calendarRef: React.RefObject<CalendarCoreRef | null>) => {
			calendarRef.current?.updateSize();
		},
		[],
	);

	// Update calendar size when sidebar state changes
	useEffect(() => {
		// Small delay to allow CSS transition to start
		const timer = setTimeout(() => {
			setCalendarHeight(calculateHeight());
		}, 50);

		return () => clearTimeout(timer);
	}, [calculateHeight]);

	return {
		calendarHeight,
		isRefreshing,
		handleRefreshWithBlur,
		handleUpdateSize,
		setCalendarHeight,
	};
}
