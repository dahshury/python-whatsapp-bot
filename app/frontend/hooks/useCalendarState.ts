/**
 * useCalendarState Hook
 *
 * Custom hook for managing calendar view state, dates, slot times,
 * and UI synchronization. Handles localStorage persistence and
 * optimized state updates.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSlotTimes } from "@/lib/calendar-config";

export interface CalendarStateOptions {
	freeRoam: boolean;
	initialView: string;
	initialDate?: string;
}

export interface CalendarViewState {
	currentView: string;
	currentDate: Date;
	slotTimes: {
		slotMinTime: string;
		slotMaxTime: string;
	};
	slotTimesKey: number;
	isHydrated: boolean;
}

export interface CalendarStateActions {
	setCurrentView: (view: string) => void;
	setCurrentDate: (date: Date) => void;
}

export type UseCalendarStateReturn = CalendarViewState & CalendarStateActions;

/**
 * Custom hook for managing calendar state
 */
export function useCalendarState(
	options: CalendarStateOptions,
): UseCalendarStateReturn {
	const { freeRoam, initialView, initialDate } = options;
	const [isHydrated, setIsHydrated] = useState(false);
	const [slotTimesKey, setSlotTimesKey] = useState(0);

	// Initialize current date from localStorage or options
	const [currentDate, setCurrentDateState] = useState<Date>(() => {
		if (typeof window !== "undefined") {
			const savedDate = localStorage.getItem("calendar-date");
			if (savedDate) {
				const date = new Date(savedDate);
				if (!Number.isNaN(date.getTime())) {
					return date;
				}
			}
		}
		const date = initialDate ? new Date(initialDate) : new Date();
		return date;
	});

	// Initialize current view from localStorage or options
	const initialViewFromStorage = useMemo(() => {
		let viewToUse = initialView;
		if (typeof window !== "undefined") {
			const savedView = localStorage.getItem("calendar-view");
			if (savedView) {
				viewToUse = savedView;
			}
		}
		return viewToUse;
	}, [initialView]);

	const [currentView, setCurrentViewState] = useState<string>(
		initialViewFromStorage,
	);

	// Calculate slot times based on current date and view
	const slotTimes = useMemo(
		() => getSlotTimes(currentDate, freeRoam, currentView),
		[currentDate, freeRoam, currentView],
	);

	/**
	 * Hydration effect
	 */
	useEffect(() => {
		setIsHydrated(true);
	}, []);

	/**
	 * Save view to localStorage when it changes after hydration
	 */
	useEffect(() => {
		if (isHydrated && currentView) {
			localStorage.setItem("calendar-view", currentView);
		}
	}, [currentView, isHydrated]);

	/**
	 * Save date to localStorage when it changes after hydration
	 */
	useEffect(() => {
		if (isHydrated && currentDate) {
			localStorage.setItem("calendar-date", currentDate.toISOString());
		}
	}, [currentDate, isHydrated]);

	/**
	 * Update slot times key when free roam mode changes
	 * This ensures FullCalendar re-renders with correct slot times
	 */
	useEffect(() => {
		if (isHydrated) {
			// Force re-render when freeRoam changes to update slot times
			console.debug(
				`Calendar re-rendering due to freeRoam change: ${freeRoam}`,
			);
			setSlotTimesKey((prevKey) => prevKey + 1);
		}
	}, [freeRoam, isHydrated]);

	/**
	 * Set current view with validation
	 */
	const setCurrentView = useCallback(
		(view: string) => {
			if (view !== currentView) {
				setCurrentViewState(view);
				// Manually increment slotTimesKey when view changes
				setSlotTimesKey((prevKey) => prevKey + 1);
			}
		},
		[currentView],
	);

	/**
	 * Set current date with validation
	 */
	const setCurrentDate = useCallback(
		(date: Date) => {
			if (date.getTime() !== currentDate.getTime()) {
				setCurrentDateState(date);
			}
		},
		[currentDate],
	);

	return {
		currentView,
		currentDate,
		slotTimes,
		slotTimesKey,
		isHydrated,
		setCurrentView,
		setCurrentDate,
	};
}
