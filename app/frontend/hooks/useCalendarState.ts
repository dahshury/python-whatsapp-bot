/**
 * useCalendarState Hook
 *
 * Custom hook for managing calendar view state, dates, slot times,
 * and UI synchronization. Handles localStorage persistence and
 * optimized state updates.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
	isChangingHours: boolean;
}

export interface CalendarStateActions {
	setCurrentView: (view: string) => void;
	setCurrentDate: (date: Date) => void;
	updateSlotTimes: (date: Date, force?: boolean) => void;
	setIsChangingHours: (changing: boolean) => void;
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
	const [isChangingHours, setIsChangingHours] = useState(false);
	const [slotTimesKey, setSlotTimesKey] = useState(0);
	
	// Refs to track state and prevent infinite loops
	const changingHoursTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const isChangingHoursRef = useRef<boolean>(false);
	const currentDateRef = useRef<Date | null>(null);
	const isUpdatingSlotTimesRef = useRef<boolean>(false);
	const lastSlotUpdateDateRef = useRef<Date | null>(null);

	// Initialize current date from localStorage or options
	const [currentDate, setCurrentDateState] = useState<Date>(() => {
		if (typeof window !== "undefined") {
			const savedDate = localStorage.getItem("calendar-date");
			if (savedDate) {
				const date = new Date(savedDate);
				if (!Number.isNaN(date.getTime())) {
					currentDateRef.current = date;
					return date;
				}
			}
		}
		const date = initialDate ? new Date(initialDate) : new Date();
		currentDateRef.current = date;
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
	const viewRef = useRef<string>(initialViewFromStorage);
	const _freeRoamRef = useRef<boolean>(freeRoam);

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
			viewRef.current = currentView;
		}
	}, [currentView, isHydrated]);

	/**
	 * Save date to localStorage when it changes after hydration
	 */
	useEffect(() => {
		if (isHydrated && currentDate) {
			localStorage.setItem("calendar-date", currentDate.toISOString());
			currentDateRef.current = currentDate;
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
	 * Cleanup timeout on unmount
	 */
	useEffect(() => {
		return () => {
			if (changingHoursTimeoutRef.current) {
				clearTimeout(changingHoursTimeoutRef.current);
			}
		};
	}, []);

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
	 * Set current date with validation - NO slotTimesKey increment here
	 */
	const setCurrentDate = useCallback(
		(date: Date) => {
			if (date.getTime() !== currentDate.getTime()) {
				setCurrentDateState(date);
				// DON'T increment slotTimesKey here - let updateSlotTimes handle it
			}
		},
		[currentDate],
	);

	/**
	 * Set isChangingHours with ref sync
	 */
	const setIsChangingHoursSync = useCallback((changing: boolean) => {
		isChangingHoursRef.current = changing;
		setIsChangingHours(changing);
	}, []);

	/**
	 * Update slot times with optional force refresh - FIXED to prevent infinite loops
	 */
	const updateSlotTimes = useCallback(
		(date: Date, force = false) => {
			// Prevent overlapping slot time computations
			if (isUpdatingSlotTimesRef.current && !force) {
				console.debug("Skipping updateSlotTimes - already updating");
				return;
			}
			
			// Skip if the date is the same as the last slot update to avoid re-entrancy
			if (!force && lastSlotUpdateDateRef.current && lastSlotUpdateDateRef.current.getTime() === date.getTime()) {
				console.debug("Skipping updateSlotTimes - same date as last update");
				return;
			}

			if (isChangingHoursRef.current && !force) {
				console.debug("Skipping updateSlotTimes - changing hours");
				return;
			}

			// Set the updating flag immediately with longer protection
			isUpdatingSlotTimesRef.current = true;
			
			try {
				// Use ref values to avoid state dependency issues
				const currentDateToUse = currentDateRef.current || currentDate;
				
				// Calculate slot times directly without relying on state
				const oldSlotTimes = getSlotTimes(currentDateToUse, freeRoam, currentView);
				const newSlotTimes = getSlotTimes(date, freeRoam, currentView);

				// Check if slot times are actually changing
				const isTimeChange =
					oldSlotTimes.slotMinTime !== newSlotTimes.slotMinTime ||
					oldSlotTimes.slotMaxTime !== newSlotTimes.slotMaxTime;

				console.debug("updateSlotTimes:", {
					oldSlotTimes,
					newSlotTimes,
					isTimeChange,
					currentDate: currentDateToUse.toISOString(),
					newDate: date.toISOString(),
					force,
				});

				// Update the current date if needed (this won't trigger slotTimesKey increment)
				if (date.getTime() !== currentDateToUse.getTime()) {
					setCurrentDateState(date);
				}

				// Remember this date to prevent loops
				lastSlotUpdateDateRef.current = date;

				// ONLY increment slotTimesKey if there's an actual slot time change
				if (isTimeChange || force) {
					console.debug("Slot times changed - incrementing key ONCE");
					
					// Clear any existing timeout
					if (changingHoursTimeoutRef.current) {
						clearTimeout(changingHoursTimeoutRef.current);
					}

					isChangingHoursRef.current = true;
					setIsChangingHours(true);
					
					// Increment slotTimesKey exactly ONCE
					setSlotTimesKey((prev) => prev + 1);

					// Reset isChangingHours after a longer delay
					changingHoursTimeoutRef.current = setTimeout(() => {
						console.debug("Resetting isChangingHours flag");
						isChangingHoursRef.current = false;
						setIsChangingHours(false);
						changingHoursTimeoutRef.current = null;
					}, 1000);
				} else {
					console.debug("No slot time change detected - skipping key increment");
				}
			} finally {
				// Always reset the updating flag after a longer delay
				setTimeout(() => {
					console.debug("Resetting isUpdatingSlotTimes flag");
					isUpdatingSlotTimesRef.current = false;
				}, 500);
			}
		},
		[currentDate, currentView, freeRoam],
	);

	return {
		currentView,
		currentDate,
		slotTimes,
		slotTimesKey,
		isHydrated,
		isChangingHours,
		setCurrentView,
		setCurrentDate,
		updateSlotTimes,
		setIsChangingHours: setIsChangingHoursSync,
	};
}
