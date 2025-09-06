import type { CalendarApi } from "@fullcalendar/core";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CalendarCoreRef } from "@/components/calendar-core";
// validRange handled via FullCalendar internals for button disabling
import { count } from "@/lib/dev-profiler";

interface UseCalendarToolbarProps {
	calendarRef: React.RefObject<CalendarCoreRef> | null;
	currentView: string;
	onViewChange: (view: string) => void;
}

interface UseCalendarToolbarReturn {
	// State
	title: string;
	activeView: string;
	isPrevDisabled: boolean;
	isNextDisabled: boolean;
	isTodayDisabled: boolean;
	visibleEventCount?: number;

	// Actions
	handlePrev: () => void;
	handleNext: () => void;
	handleToday: () => void;
}

// Use FullCalendar's native title - they already compute it perfectly in their updateData() method
// This mirrors their ViewApi.get title() which returns getCurrentData().viewTitle
const getTitleFromAPI = (api: CalendarApi): string => {
	try {
		// FullCalendar's ViewApi.title getter returns the properly computed title
		// This comes from their internal buildTitle(dateProfile, viewOptions, dateEnv) function
		const title = api.view?.title;
		return title || ""; // empty string triggers spinner in consumers
	} catch (error) {
		console.warn("Error getting title from FullCalendar API:", error);
		return ""; // keep spinner on error
	}
};

export function useCalendarToolbar({
	calendarRef,
	currentView,
	onViewChange,
}: UseCalendarToolbarProps): UseCalendarToolbarReturn {
	const [title, setTitle] = useState(""); // empty until API supplies real title (spinner shows)
	const [activeView, setActiveView] = useState(currentView);
	const [isPrevDisabled, setIsPrevDisabled] = useState(false);
	const [isNextDisabled, setIsNextDisabled] = useState(false);
	const [isTodayDisabled, setIsTodayDisabled] = useState(false);
	const [visibleEventCount, setVisibleEventCount] = useState<number>(0);

	// Update active view when currentView prop changes
	useEffect(() => {
		setActiveView(currentView);
		// Title will be updated by updateButtonStates when API is ready
	}, [currentView]);

	// Function to update button states based on FullCalendar's internal logic
	const isUpdatingRef = useRef(false);
	const updateButtonStates = useCallback(() => {
		if (isUpdatingRef.current) return;
		isUpdatingRef.current = true;
		count("updateButtonStates");

		// Guard: if API not ready yet, release the lock so future attempts can proceed
		if (!calendarRef || !calendarRef.current?.getApi) {
			isUpdatingRef.current = false;
			return;
		}

		try {
			const calendarApi = calendarRef.current.getApi();
			if (!calendarApi) return;

			// Use FullCalendar's native title computation
			const viewTitle = getTitleFromAPI(calendarApi);
			console.log("🔄 [TOOLBAR] Title update:", {
				newTitle: viewTitle,
				viewType: calendarApi.view?.type,
				hasView: !!calendarApi.view,
				currentStart: calendarApi.view?.currentStart,
				currentEnd: calendarApi.view?.currentEnd,
			});
			setTitle((prev) => (prev === viewTitle ? prev : viewTitle));

			// Update active view from public API
			const viewType = calendarApi.view?.type;
			if (viewType) {
				setActiveView((prev) => (prev === viewType ? prev : viewType));
			}

			// Use simple navigation state checks with public API
			try {
				// Get current date range from view
				const currentStart = calendarApi.view.currentStart;
				const currentEnd = calendarApi.view.currentEnd;
				const today = new Date();

				// Check if today is within current view range
				const isTodayInRange =
					currentStart &&
					currentEnd &&
					today >= currentStart &&
					today < currentEnd;
				setIsTodayDisabled(!!isTodayInRange);

				// Prefer FullCalendar's own validity computation for prev navigation
				let computedByFc: boolean | null = null;
				try {
					// Narrow types locally without polluting file-level types
					const api = (
						calendarRef?.current as unknown as { getApi?: () => unknown }
					)?.getApi?.() as
						| {
								currentDataManager?: {
									data?: {
										dateProfileGenerator?: {
											buildPrev: (
												dp: unknown,
												cd: unknown,
												f?: boolean,
											) => { isValid: boolean };
										};
									};
									state?: { dateProfile?: unknown; currentDate?: unknown };
								};
						  }
						| undefined;
					const dm = api?.currentDataManager;
					const gen = dm?.data?.dateProfileGenerator;
					const state = dm?.state;
					if (gen && state?.dateProfile && state?.currentDate) {
						const prevInfo = gen.buildPrev(
							state.dateProfile,
							state.currentDate,
							false,
						);
						computedByFc = !prevInfo?.isValid;
						setIsPrevDisabled(computedByFc);
					}
				} catch {
					// ignore and fall back
				}

				// If unable to compute via FC internals, default to enabled
				if (computedByFc === null) setIsPrevDisabled(false);

				// Compute Next disabled state using FullCalendar internals when possible
				let nextComputedByFc: boolean | null = null;
				try {
					const api = (
						calendarRef?.current as unknown as { getApi?: () => unknown }
					)?.getApi?.() as
						| {
								currentDataManager?: {
									data?: {
										dateProfileGenerator?: {
											buildNext: (
												dp: unknown,
												cd: unknown,
												f?: boolean,
											) => { isValid: boolean };
										};
									};
									state?: { dateProfile?: unknown; currentDate?: unknown };
								};
						  }
						| undefined;
					const dm = api?.currentDataManager;
					const gen = dm?.data?.dateProfileGenerator;
					const state = dm?.state;
					if (gen && state?.dateProfile && state?.currentDate) {
						const nextInfo = gen.buildNext(
							state.dateProfile,
							state.currentDate,
							false,
						);
						nextComputedByFc = !nextInfo?.isValid;
						setIsNextDisabled(nextComputedByFc);
					}
				} catch {
					// ignore and fall back
				}

				// If unable to compute via FC internals, default to enabled
				if (nextComputedByFc === null) setIsNextDisabled(false);

				// Count visible events
				if (currentStart && currentEnd) {
					const allEvents = calendarApi.getEvents() || [];
					const visibleCount = allEvents.filter((event) => {
						const eventStart = event.start;
						if (!eventStart) return false;
						return eventStart >= currentStart && eventStart < currentEnd;
					}).length;
					setVisibleEventCount((prev) =>
						prev === visibleCount ? prev : visibleCount,
					);
				}
			} catch (err) {
				console.warn("Error checking navigation state:", err);
				// Set safe defaults
				setIsPrevDisabled(false);
				setIsNextDisabled(false);
				setIsTodayDisabled(false);
				setVisibleEventCount(0);
			}
		} catch (error) {
			console.error("Error updating button states:", error);
			// Set safe defaults on error
			setIsPrevDisabled((prev) => (prev === false ? prev : false));
			setIsNextDisabled((prev) => (prev === false ? prev : false));
			setIsTodayDisabled((prev) => (prev === false ? prev : false));
		} finally {
			isUpdatingRef.current = false;
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

					// Define event handlers - these mirror FullCalendar's internal events that trigger updateData()
					const handleDatesSet = () => {
						console.log("🔄 [TOOLBAR] datesSet event fired - updating title");
						updateButtonStates();
					};
					const handleEventsSet = () => updateButtonStates();

					// Listen for FullCalendar's canonical events that trigger their internal updateData()
					calendarApi.on("datesSet", handleDatesSet);
					calendarApi.on("eventsSet", handleEventsSet);

					// Store cleanup function
					cleanupListeners = () => {
						calendarApi.off("datesSet", handleDatesSet);
						calendarApi.off("eventsSet", handleEventsSet);
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
	}, [calendarRef, updateButtonStates]);

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
		// slight defer to let FullCalendar finish switching views
		const tid = setTimeout(() => updateButtonStates(), 0);
		return () => clearTimeout(tid);
	}, [updateButtonStates]);

	// Navigation handlers
	const handlePrev = useCallback(() => {
		if (!calendarRef || !calendarRef.current?.getApi) return;
		const calendarApi = calendarRef.current.getApi();
		if (calendarApi) {
			calendarApi.prev();
			// Force immediate update after navigation
			setTimeout(updateButtonStates, 0);
		}
	}, [calendarRef, updateButtonStates]);

	const handleNext = useCallback(() => {
		if (!calendarRef || !calendarRef.current?.getApi) return;
		const calendarApi = calendarRef.current.getApi();
		if (calendarApi) {
			calendarApi.next();
			// Force immediate update after navigation
			setTimeout(updateButtonStates, 0);
		}
	}, [calendarRef, updateButtonStates]);

	const handleToday = useCallback(() => {
		if (!calendarRef || !calendarRef.current?.getApi) return;
		const calendarApi = calendarRef.current.getApi();
		if (calendarApi) {
			calendarApi.today();
			// Force immediate update after navigation
			setTimeout(updateButtonStates, 0);
		}
	}, [calendarRef, updateButtonStates]);

	return {
		// State
		title,
		activeView,
		isPrevDisabled,
		isNextDisabled,
		isTodayDisabled,
		visibleEventCount,

		// Actions
		handlePrev,
		handleNext,
		handleToday,
	};
}
