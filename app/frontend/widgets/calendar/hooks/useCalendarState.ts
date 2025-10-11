/**
 * useCalendarState Hook
 *
 * Custom hook for managing calendar view state, dates, slot times,
 * and UI synchronization. Handles localStorage persistence and
 * optimized state updates.
 */

import { getSlotTimes } from "@shared/libs/calendar/calendar-config";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface CalendarStateOptions {
	freeRoam: boolean;
	initialView: string;
	initialDate?: string;
	/** Optional prefix to separate persisted keys per context (e.g., "calendar-page", "documents-drawer") */
	storageKeyPrefix?: string;
	/** Optional explicit storage key for view; overrides storageKeyPrefix if provided */
	viewStorageKey?: string;
	/** Optional explicit storage key for date; overrides storageKeyPrefix if provided */
	dateStorageKey?: string;
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
export function useCalendarState(options: CalendarStateOptions): UseCalendarStateReturn {
	const { freeRoam, initialView, initialDate, storageKeyPrefix, viewStorageKey, dateStorageKey } = options;
	const [isHydrated, setIsHydrated] = useState(false);
	const [slotTimesKey, setSlotTimesKey] = useState(0);

	// Resolve storage keys with backward-compatible defaults
	const resolvedViewKey = useMemo(() => {
		if (viewStorageKey) return viewStorageKey;
		if (storageKeyPrefix) return `${storageKeyPrefix}:view`;
		return "calendar-view";
	}, [viewStorageKey, storageKeyPrefix]);

	const resolvedDateKey = useMemo(() => {
		if (dateStorageKey) return dateStorageKey;
		if (storageKeyPrefix) return `${storageKeyPrefix}:date`;
		return "calendar-date";
	}, [dateStorageKey, storageKeyPrefix]);

	// Initialize current date from localStorage or options
	const [currentDate, setCurrentDateState] = useState<Date>(() => {
		if (typeof window !== "undefined") {
			const savedDate = localStorage.getItem(resolvedDateKey);
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
			const savedView = localStorage.getItem(resolvedViewKey);
			if (savedView) {
				viewToUse = savedView;
			}
		}
		return viewToUse;
	}, [initialView, resolvedViewKey]);

	const [currentView, setCurrentViewState] = useState<string>(initialViewFromStorage);

	// Calculate slot times based on current date and view
	const slotTimes = useMemo(
		() => getSlotTimes(currentDate, freeRoam, currentView),
		[currentDate, freeRoam, currentView]
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
			localStorage.setItem(resolvedViewKey, currentView);
		}
	}, [currentView, isHydrated, resolvedViewKey]);

	/**
	 * Save date to localStorage when it changes after hydration
	 */
	useEffect(() => {
		if (isHydrated && currentDate) {
			localStorage.setItem(resolvedDateKey, currentDate.toISOString());
		}
	}, [currentDate, isHydrated, resolvedDateKey]);

	/**
	 * Update slot times key only when freeRoam actually changes after hydration
	 * Avoid triggering on initial hydration when freeRoam hasn't changed
	 */
	const prevFreeRoamRef = useRef<boolean>(freeRoam);
	useEffect(() => {
		if (!isHydrated) return;
		const previous = prevFreeRoamRef.current;
		if (previous !== freeRoam) {
			prevFreeRoamRef.current = freeRoam;
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
		[currentView]
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
		[currentDate]
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
