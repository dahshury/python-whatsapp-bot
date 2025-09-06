/**
 * useCalendarEvents Hook
 *
 * Custom hook for managing calendar events including data fetching,
 * processing, and state management. Provides clean separation of concerns
 * and reusable logic for calendar components.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
	getReservationEventProcessor,
	type ReservationProcessingOptions,
} from "@/lib/reservation-event-processor";
import {
	useConversationsData,
	useReservationsData,
	useVacationsData,
} from "@/lib/websocket-data-provider";
import type { CalendarEvent } from "@/types/calendar";

export interface UseCalendarEventsOptions {
	freeRoam: boolean;
	isRTL: boolean;
	autoRefresh?: boolean;
	refreshInterval?: number;
}

export interface CalendarEventsState {
	events: CalendarEvent[];
	loading: boolean;
	error: string | null;
	lastUpdated: Date | null;
}

export interface CalendarEventsActions {
	refetchEvents: () => Promise<void>;
	invalidateCache: () => void;
	refreshData: () => Promise<void>;
	addEvent: (event: CalendarEvent) => void;
	updateEvent: (id: string, updatedEvent: Partial<CalendarEvent>) => void;
	removeEvent: (id: string) => void;
}

export type UseCalendarEventsReturn = CalendarEventsState &
	CalendarEventsActions;

/**
 * Custom hook for managing calendar events
 */
export function useCalendarEvents(
	options: UseCalendarEventsOptions,
): UseCalendarEventsReturn {
	const [state, setState] = useState<CalendarEventsState>({
		events: [],
		loading: true,
		error: null,
		lastUpdated: null,
	});

	// Use unified data provider instead of calendar data service
	const {
		reservations,
		isLoading: reservationsLoading,
		error: reservationsError,
		refresh: refreshReservations,
	} = useReservationsData();

	const {
		conversations,
		isLoading: conversationsLoading,
		error: conversationsError,
		refresh: refreshConversations,
	} = useConversationsData();

	const {
		vacations: vacationPeriods,
		isLoading: vacationsLoading,
		error: vacationsError,
		refresh: refreshVacations,
	} = useVacationsData();

	// Memoize event processor to prevent unnecessary re-instantiation
	const eventProcessor = useMemo(() => getReservationEventProcessor(), []);

	// Combine loading and error states
	const isDataLoading =
		reservationsLoading || conversationsLoading || vacationsLoading;
	const dataError = reservationsError || conversationsError || vacationsError;

	// Memoize processing options
	const processingOptions = useMemo(
		(): Omit<ReservationProcessingOptions, "vacationPeriods"> => ({
			freeRoam: options.freeRoam,
			isRTL: options.isRTL,
		}),
		[options.freeRoam, options.isRTL],
	);

	/**
	 * Process calendar events from unified data
	 */
	const processEvents = useCallback((): void => {
		try {
			setState((prev) => ({
				...prev,
				loading: isDataLoading,
				error: dataError,
			}));

			// Only process if we have data and no errors
			if (
				!isDataLoading &&
				!dataError &&
				reservations &&
				conversations &&
				vacationPeriods
			) {
				// Process events
				const fullProcessingOptions: ReservationProcessingOptions = {
					...processingOptions,
					vacationPeriods,
				};

				const processedEvents = eventProcessor.generateCalendarEvents(
					Object.fromEntries(
						Object.entries(reservations).map(([key, reservationList]) => [
							key,
							reservationList.map((reservation) => ({
								date: (reservation as { date?: string }).date,
								time_slot: (reservation as { time_slot?: string }).time_slot,
								customer_name: (reservation as { customer_name?: string })
									.customer_name,
								title: (reservation as { customer_name?: string })
									.customer_name,
								...reservation,
							})),
						]),
					) as Record<
						string,
						Array<{
							date: string;
							time_slot: string;
							customer_name?: string;
							title?: string;
							[key: string]: unknown;
						}>
					>,
					conversations as Record<
						string,
						Array<{ id?: string; text?: string; ts?: string }>
					>,
					fullProcessingOptions,
				);

				setState((prev) => ({
					...prev,
					events: processedEvents,
					loading: false,
					error: null,
					lastUpdated: new Date(),
				}));
			} else if (dataError) {
				setState((prev) => ({
					...prev,
					loading: false,
					error: dataError,
					lastUpdated: new Date(),
				}));
			}
		} catch (error) {
			console.error("Error processing calendar events:", error);
			setState((prev) => ({
				...prev,
				loading: false,
				error:
					error instanceof Error ? error.message : "Unknown error occurred",
				lastUpdated: new Date(),
			}));
		}
	}, [
		isDataLoading,
		dataError,
		reservations,
		conversations,
		vacationPeriods,
		eventProcessor,
		processingOptions,
	]);

	/**
	 * Refresh events by refreshing unified data
	 */
	const refreshData = useCallback(async (): Promise<void> => {
		try {
			// Refresh all data sources
			await Promise.all([
				refreshReservations(),
				refreshConversations(),
				refreshVacations(),
			]);
			// processEvents will be called automatically via useEffect when data updates
		} catch (error) {
			console.error("Error refreshing calendar events:", error);
		}
	}, [refreshReservations, refreshConversations, refreshVacations]);

	/**
	 * Invalidate cache without refetching (kept for compatibility)
	 */
	const invalidateCache = useCallback((): void => {
		// No-op since unified provider handles caching
		console.log("invalidateCache called - unified provider handles caching");
	}, []);

	/**
	 * Add event to local state
	 */
	const addEvent = useCallback((event: CalendarEvent): void => {
		setState((prev) => ({
			...prev,
			events: [...prev.events, event],
			lastUpdated: new Date(),
		}));
	}, []);

	/**
	 * Update event in local state
	 */
	const updateEvent = useCallback(
		(id: string, updatedEvent: Partial<CalendarEvent>): void => {
			setState((prev) => ({
				...prev,
				events: prev.events.map((event) =>
					event.id === id ? { ...event, ...updatedEvent } : event,
				),
				lastUpdated: new Date(),
			}));
		},
		[],
	);

	/**
	 * Remove event from local state
	 */
	const removeEvent = useCallback((id: string): void => {
		setState((prev) => ({
			...prev,
			events: prev.events.filter((event) => event.id !== id),
			lastUpdated: new Date(),
		}));
	}, []);

	/**
	 * Process events when data changes
	 */
	useEffect(() => {
		processEvents();
	}, [processEvents]);

	/**
	 * Auto-refresh functionality
	 */
	useEffect(() => {
		if (!options.autoRefresh) return;

		const interval = setInterval(
			() => {
				refreshData();
			},
			options.refreshInterval || 5 * 60 * 1000,
		); // Default 5 minutes

		return () => clearInterval(interval);
	}, [options.autoRefresh, options.refreshInterval, refreshData]);

	return {
		...state,
		refetchEvents: refreshData, // Use refreshData instead of fetchEvents
		invalidateCache,
		refreshData,
		addEvent,
		updateEvent,
		removeEvent,
	};
}
