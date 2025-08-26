import { useCallback, useEffect, useState } from "react";
import type { CalendarCoreRef } from "@/components/calendar-core";
import { VacationEventsService } from "@/lib/vacation-events-service";
import type { VacationPeriod } from "@/types/calendar";

interface UseCalendarInitializationProps {
	calculateHeight: () => number | "auto";
	sidebarOpen?: boolean;
	refreshData: () => Promise<void>;
	setOnVacationUpdated?: (
		callback: (vacationPeriods: VacationPeriod[]) => void,
	) => void;
	calendarRef?: React.RefObject<CalendarCoreRef>;
}

export function useCalendarInitialization({
	calculateHeight,
	sidebarOpen: _sidebarOpen,
	refreshData,
	setOnVacationUpdated,
	calendarRef,
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

	// Register vacation events update callback using FullCalendar's native event management
	useEffect(() => {
		const updateVacationEvents = (vacationPeriods: VacationPeriod[]) => {
			console.log(
				"🔄 [CALENDAR-INIT] Updating vacation events using FullCalendar API...",
			);
			if (calendarRef?.current) {
				const api = calendarRef.current.getApi();
				if (api) {
					VacationEventsService.updateVacationEvents(api, vacationPeriods);
					console.log(
						"🔄 [CALENDAR-INIT] Vacation events updated via FullCalendar API",
					);
				}
			}
		};
		setOnVacationUpdated?.(updateVacationEvents);
	}, [setOnVacationUpdated, calendarRef]);

	// Note: Conversations are already fetched by WebSocketDataProvider on mount
	// No need to fetch them again here

	// Set initial height and update on resize
	useEffect(() => {
		setCalendarHeight(calculateHeight());
	}, [calculateHeight]);

	// Smooth updateSize handler called on container resize frames
	const handleUpdateSize = useCallback(
		(calendarRef: React.RefObject<CalendarCoreRef>) => {
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
