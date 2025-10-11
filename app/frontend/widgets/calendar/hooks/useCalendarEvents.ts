/**
 * useCalendarEvents Hook
 *
 * Custom hook for managing calendar events including data fetching,
 * processing, and state management. Provides clean separation of concerns
 * and reusable logic for calendar components.
 */

import { useConversationsData, useReservationsData, useVacationsData } from "@shared/libs/data/websocket-data-provider";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CalendarEvent } from "@/entities/event";
import {
	getReservationEventProcessor,
	type ReservationProcessingOptions,
} from "@/processes/reservations/reservation-events.process";

export interface UseCalendarEventsOptions {
	freeRoam: boolean;
	isLocalized: boolean;
	autoRefresh?: boolean;
	refreshInterval?: number;
	ageByWaId?: Record<string, number | null>;
	/** When true, do not include conversation events in generated calendar events. */
	excludeConversations?: boolean;
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

export type UseCalendarEventsReturn = CalendarEventsState & CalendarEventsActions;

/**
 * Custom hook for managing calendar events
 */
export function useCalendarEvents(options: UseCalendarEventsOptions): UseCalendarEventsReturn {
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
	const isDataLoading = reservationsLoading || conversationsLoading || vacationsLoading;
	const dataError = reservationsError || conversationsError || vacationsError;

	// Prepare static processing options (age map is injected at call site below)
	const processingOptions = useMemo(
		(): Omit<ReservationProcessingOptions, "vacationPeriods" | "ageByWaId"> => ({
			freeRoam: options.freeRoam,
			isLocalized: options.isLocalized,
		}),
		[options.freeRoam, options.isLocalized]
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
				vacationPeriods &&
				(options.excludeConversations ? true : Boolean(conversations))
			) {
				// Process events

				const processedEvents = eventProcessor.generateCalendarEvents(
					Object.fromEntries(
						Object.entries(reservations).map(([key, reservationList]) => [
							key,
							reservationList.map((reservation) => {
								const base: Record<string, unknown> = {
									...(reservation as unknown as Record<string, unknown>),
								};
								// Prevent duplicate keys in object literal by deleting before override
								delete (base as { date?: unknown }).date;
								delete (base as { time_slot?: unknown }).time_slot;
								delete (base as { customer_name?: unknown }).customer_name;
								return {
									...base,
									date: (reservation as { date?: string }).date as string,
									time_slot: (reservation as { time_slot?: string }).time_slot as string,
									customer_name: (reservation as { customer_name?: string }).customer_name,
								};
							}),
						])
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
					options.excludeConversations
						? ({} as Record<string, Array<{ id?: string; text?: string; ts?: string }>>)
						: (conversations as Record<string, Array<{ id?: string; text?: string; ts?: string }>>),
					{
						...processingOptions,
						vacationPeriods,
						...(options.ageByWaId ? { ageByWaId: options.ageByWaId } : {}),
					}
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
				error: error instanceof Error ? error.message : "Unknown error occurred",
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
		options.ageByWaId,
		options.excludeConversations,
	]);

	/**
	 * Refresh events by refreshing unified data
	 */
	const refreshData = useCallback(async (): Promise<void> => {
		try {
			// Refresh all data sources
			await Promise.all([refreshReservations(), refreshConversations(), refreshVacations()]);
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
	const updateEvent = useCallback((id: string, updatedEvent: Partial<CalendarEvent>): void => {
		setState((prev) => ({
			...prev,
			events: prev.events.map((event) => (event.id === id ? { ...event, ...updatedEvent } : event)),
			lastUpdated: new Date(),
		}));
	}, []);

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
			options.refreshInterval || 5 * 60 * 1000
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
