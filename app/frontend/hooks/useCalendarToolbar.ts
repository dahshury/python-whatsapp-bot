import { useCallback, useEffect, useState } from "react";
import { count } from "@/lib/dev-profiler";
import type { CalendarCoreRef } from "@/components/calendar-core";
import { useLanguage } from "@/lib/language-context";

interface UseCalendarToolbarProps {
	calendarRef: React.RefObject<CalendarCoreRef>;
	currentView: string;
	freeRoam?: boolean;
	onViewChange?: (view: string) => void;
}

interface UseCalendarToolbarReturn {
	// State
	title: string;
	activeView: string;
	isPrevDisabled: boolean;
	isNextDisabled: boolean;
	isTodayDisabled: boolean;

	// Actions
	handlePrev: () => void;
	handleNext: () => void;
	handleToday: () => void;
}

// Helper function that mirrors FullCalendar's rangeContainsMarker
const rangeContainsMarker = (range: any, date: any) => {
	return (
		(range.start === null || date >= range.start) &&
		(range.end === null || date < range.end)
	);
};

export function useCalendarToolbar({
	calendarRef,
	currentView,
	freeRoam = false,
	onViewChange,
}: UseCalendarToolbarProps): UseCalendarToolbarReturn {
	const { isRTL } = useLanguage();
	const [title, setTitle] = useState("");
	const [activeView, setActiveView] = useState(currentView);
	const [isPrevDisabled, setIsPrevDisabled] = useState(false);
	const [isNextDisabled, setIsNextDisabled] = useState(false);
	const [isTodayDisabled, setIsTodayDisabled] = useState(false);

	// Update active view when currentView prop changes
	useEffect(() => {
		setActiveView(currentView);
	}, [currentView]);

	// Function to update button states based on FullCalendar's internal logic
	const updateButtonStates = useCallback(() => {
		count("updateButtonStates");
		if (!calendarRef?.current?.getApi) return;

		try {
			const calendarApi = calendarRef.current.getApi();
			if (!calendarApi) return;

			// Get calendar's internal state
			const state = calendarApi.currentData;
			if (!state) return;

			// Prefer internal state title, but fall back to the public API's view.title
			let viewTitle = "";
			if (state.viewTitle) {
				viewTitle = state.viewTitle;
			} else if (calendarApi.view?.title) {
				viewTitle = calendarApi.view.title;
			}
			setTitle(viewTitle);

			// Update active view from calendar state or public API fallback
			const viewType = state.viewSpec?.type || calendarApi.view?.type;
			if (viewType) {
				setActiveView(viewType);
			}

			// Check if we can navigate prev/next using FullCalendar's internal logic
			const dateProfile = state.dateProfile;
			const dateProfileGenerator = state.dateProfileGenerator;
			const currentDate = state.currentDate;
			const nowDate = state.dateEnv?.createMarker
				? state.dateEnv.createMarker(new Date())
				: new Date();

			if (
				dateProfile &&
				dateProfileGenerator &&
				currentDate &&
				dateProfileGenerator.build
			) {
				try {
					// Build date profiles exactly like FullCalendar does
					// The false parameter means don't force to valid date profiles
					const todayInfo = dateProfileGenerator.build(
						nowDate,
						undefined,
						false,
					);
					const prevInfo = dateProfileGenerator.buildPrev(
						dateProfile,
						currentDate,
						false,
					);
					const nextInfo = dateProfileGenerator.buildNext(
						dateProfile,
						currentDate,
						false,
					);

					// Today button is enabled if today is valid AND not in current range
					// This matches the exact logic from buildToolbarProps
					const isTodayEnabled =
						todayInfo.isValid &&
						!rangeContainsMarker(dateProfile.currentRange, nowDate);
					setIsTodayDisabled(!isTodayEnabled);

					// Prev/Next buttons match the isValid property directly
					setIsPrevDisabled(!prevInfo.isValid);
					setIsNextDisabled(!nextInfo.isValid);
				} catch (err) {
					console.warn("Error checking navigation state:", err);
					// Set safe defaults
					setIsPrevDisabled(false);
					setIsNextDisabled(false);
					setIsTodayDisabled(false);
				}
			} else {
				// If calendar data is not ready, set safe defaults
				setIsPrevDisabled(false);
				setIsNextDisabled(false);
				setIsTodayDisabled(false);
			}
		} catch (error) {
			console.error("Error updating button states:", error);
			// Set safe defaults on error
			setIsPrevDisabled(false);
			setIsNextDisabled(false);
			setIsTodayDisabled(false);
		}
	}, [calendarRef]);

	// Set up event listeners for calendar state changes
	useEffect(() => {
		count("useCalendarToolbar:effect-attach");
		let pollInterval: NodeJS.Timeout | null = null;
		let cleanupListeners: (() => void) | null = null;
		let isApiReady = false;

		// Check if API is ready and set up listeners
		const setupListeners = () => {
			if (calendarRef?.current?.getApi && !isApiReady) {
				const calendarApi = calendarRef.current.getApi();
				if (calendarApi) {
					isApiReady = true;
					
					// Clear polling since API is ready
					if (pollInterval) {
						clearInterval(pollInterval);
						pollInterval = null;
					}

					// Initial update
					updateButtonStates();

					// Define event handlers
					const handleDatesSet = () => updateButtonStates();
					const handleViewDidMount = () => updateButtonStates();
					const handleEventSet = () => updateButtonStates();

					calendarApi.on("datesSet", handleDatesSet);
					calendarApi.on("viewDidMount", handleViewDidMount);
					calendarApi.on("eventsSet", handleEventSet);

					// Store cleanup function
					cleanupListeners = () => {
						calendarApi.off("datesSet", handleDatesSet);
						calendarApi.off("viewDidMount", handleViewDidMount);
						calendarApi.off("eventsSet", handleEventSet);
					};

					return true; // API is ready
				}
			}
			return false; // API not ready
		};

		// Try to set up listeners immediately
		if (setupListeners()) {
			// API was ready immediately
			return () => {
				if (cleanupListeners) cleanupListeners();
			};
		}

		// If API not ready, start polling
		pollInterval = setInterval(() => {
			if (setupListeners()) {
				// API became ready, stop polling
				if (pollInterval) {
					clearInterval(pollInterval);
					pollInterval = null;
				}
			}
		}, 500);

		// Cleanup function
		return () => {
			if (pollInterval) {
				clearInterval(pollInterval);
			}
			if (cleanupListeners) {
				cleanupListeners();
			}
		};
	}, [calendarRef]); // Removed updateButtonStates from dependencies

	// Update button states when isRTL changes to ensure title is re-rendered with new locale
	useEffect(() => {
		// Small delay to ensure calendar has updated its locale
		const timer = setTimeout(() => {
			updateButtonStates();
		}, 100);
		return () => clearTimeout(timer);
	}, [updateButtonStates]);

	// Force update when view changes
	useEffect(() => {
		updateButtonStates();
	}, [updateButtonStates]);

	// Navigation handlers
	const handlePrev = useCallback(() => {
		if (!calendarRef?.current?.getApi) return;
		const calendarApi = calendarRef.current.getApi();
		calendarApi.prev();
		// Force immediate update after navigation
		setTimeout(updateButtonStates, 0);
	}, [calendarRef, updateButtonStates]);

	const handleNext = useCallback(() => {
		if (!calendarRef?.current?.getApi) return;
		const calendarApi = calendarRef.current.getApi();
		calendarApi.next();
		// Force immediate update after navigation
		setTimeout(updateButtonStates, 0);
	}, [calendarRef, updateButtonStates]);

	const handleToday = useCallback(() => {
		if (!calendarRef?.current?.getApi) return;
		const calendarApi = calendarRef.current.getApi();
		calendarApi.today();
		// Force immediate update after navigation
		setTimeout(updateButtonStates, 0);
	}, [calendarRef, updateButtonStates]);

	return {
		// State
		title,
		activeView,
		isPrevDisabled,
		isNextDisabled,
		isTodayDisabled,

		// Actions
		handlePrev,
		handleNext,
		handleToday,
	};
}
