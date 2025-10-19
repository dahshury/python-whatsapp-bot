/**
 * useCalendarEvents Hook
 *
 * Custom hook for managing calendar events including data fetching,
 * processing, and state management. Provides clean separation of concerns
 * and reusable logic for calendar components.
 */

import {
	useConversationsData,
	useReservationsData,
	useVacationsData,
} from "@shared/libs/data/websocket-data-provider";
import {
	profileCount,
	profileTimeEnd,
	profileTimeStart,
} from "@shared/libs/utils/calendar-profiler";
import { devGroup, devGroupEnd, devLog } from "@shared/libs/utils/dev-logger";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CalendarEvent } from "@/entities/event";
import {
	getReservationEventProcessor,
	type ReservationProcessingOptions,
} from "@/processes/reservations/reservation-events.process";

export type UseCalendarEventsOptions = {
	freeRoam: boolean;
	isLocalized: boolean;
	ageByWaId?: Record<string, number | null>;
	/** When true, do not include conversation events in generated calendar events. */
	excludeConversations?: boolean;
};

export type CalendarEventsState = {
	events: CalendarEvent[];
	loading: boolean;
	error: string | null;
	lastUpdated: Date | null;
};

export type CalendarEventsActions = {
	refetchEvents: () => Promise<void>;
	invalidateCache: () => void;
	refreshData: () => Promise<void>;
	addEvent: (event: CalendarEvent) => void;
	updateEvent: (id: string, updatedEvent: Partial<CalendarEvent>) => void;
	removeEvent: (id: string) => void;
};

export type UseCalendarEventsReturn = CalendarEventsState &
	CalendarEventsActions;

// Helper function moved outside hook
function computeResCount(res: Record<string, unknown[]>): {
	keys: number;
	len: number;
} {
	const keys = Object.keys(res || {}).length;
	let len = 0;
	for (const k in res) {
		if (Object.hasOwn(res, k)) {
			len += Array.isArray(res[k]) ? (res[k] as unknown[]).length : 0;
		}
	}
	return { keys, len };
}

function computeConvCount(conv: Record<string, unknown[]>): {
	keys: number;
	len: number;
} {
	const keys = Object.keys(conv || {}).length;
	let len = 0;
	for (const k in conv) {
		if (Object.hasOwn(conv, k)) {
			len += Array.isArray(conv[k]) ? (conv[k] as unknown[]).length : 0;
		}
	}
	return { keys, len };
}

function computeDataSignatureImpl(
	res: Record<string, unknown[]>,
	conv: Record<string, unknown[]>,
	vac: unknown[],
	excludeConversations?: boolean
): string {
	try {
		const { keys: rKeys, len: rLen } = computeResCount(res);
		const vLen = Array.isArray(vac) ? vac.length : 0;
		if (excludeConversations) {
			return `rK:${rKeys}|rL:${rLen}|vL:${vLen}`;
		}
		const { keys: cKeys, len: cLen } = computeConvCount(conv);
		return `rK:${rKeys}|rL:${rLen}|cK:${cKeys}|cL:${cLen}|vL:${vLen}`;
	} catch {
		return `rK:${Object.keys(res || {}).length}|vL:${Array.isArray(vac) ? vac.length : 0}`;
	}
}

function computeEventsSignatureImpl(events: CalendarEvent[]): string {
	try {
		let sig = `len:${events?.length ?? 0}`;
		const limit = Math.min(events.length, 10);
		for (let i = 0; i < limit; i += 1) {
			const ev = events[i] as CalendarEvent;
			sig += `|${String(ev.id)}|${String(ev.start)}|${String(ev.end ?? "")}`;
		}
		return sig;
	} catch {
		return `len:${events?.length ?? 0}`;
	}
}

type ProcessingInputs = {
	isDataLoading: boolean;
	dataError: string | null;
	reservations: Record<string, unknown[]> | undefined;
	vacationPeriods: unknown[] | undefined;
	conversations: Record<string, unknown[]> | undefined;
};

function validateProcessingInputsImpl(
	input: ProcessingInputs & { excludeConversations?: boolean }
): boolean {
	return !(
		input.isDataLoading ||
		input.dataError ||
		!input.reservations ||
		!input.vacationPeriods ||
		(input.excludeConversations ? false : !input.conversations)
	);
}

type DiagnosticInputs = {
	reservationsData: Record<string, unknown[]> | undefined;
	conversationsData: Record<string, unknown[]> | undefined;
	vacationsData: unknown[] | undefined;
	loading: boolean;
	error: string | null;
};

function computeDiagnosticsImpl(input: DiagnosticInputs) {
	try {
		const countKeys = (obj: Record<string, unknown[]>) =>
			Object.keys(obj || {}).length;
		const countLen = (obj: Record<string, unknown[]>) => {
			let n = 0;
			for (const k in obj) {
				if (Object.hasOwn(obj, k)) {
					n += Array.isArray(obj[k]) ? (obj[k] as unknown[]).length : 0;
				}
			}
			return n;
		};
		return {
			reservationsKeys: countKeys(
				(input.reservationsData || {}) as unknown as Record<string, unknown[]>
			),
			reservationsLen: countLen(
				(input.reservationsData || {}) as unknown as Record<string, unknown[]>
			),
			conversationsKeys: countKeys(
				(input.conversationsData || {}) as unknown as Record<string, unknown[]>
			),
			conversationsLen: countLen(
				(input.conversationsData || {}) as unknown as Record<string, unknown[]>
			),
			vacationsLen: Array.isArray(input.vacationsData)
				? input.vacationsData.length
				: 0,
			loading: input.loading,
			error: Boolean(input.error),
		};
	} catch {
		return null;
	}
}

function buildReservationEntriesImpl(
	reservationsMap: Record<string, unknown[]> | undefined
): [
	string,
	Array<{
		date: string;
		time_slot: string;
		customer_name?: string;
		title?: string;
		[key: string]: unknown;
	}>,
][] {
	if (!reservationsMap) {
		return [];
	}
	return Object.entries(reservationsMap).map(([key, reservationList]) => [
		key,
		reservationList.map((reservation) => {
			const base: Record<string, unknown> = {
				...(reservation as unknown as Record<string, unknown>),
			};
			(base as { date?: unknown }).date = undefined;
			(base as { time_slot?: unknown }).time_slot = undefined;
			(base as { customer_name?: unknown }).customer_name = undefined;
			const customerName = (
				reservation as { customer_name?: string | undefined }
			).customer_name;
			return {
				...base,
				date: (reservation as { date?: string }).date as string,
				time_slot: (reservation as { time_slot?: string }).time_slot as string,
				...(customerName !== undefined ? { customer_name: customerName } : {}),
			};
		}),
	]) as [
		string,
		{
			[key: string]: unknown;
			date: string;
			time_slot: string;
			customer_name?: string;
			title?: string;
		}[],
	][];
}

type ProcessKeyInput = {
	inputSig: string;
	isDataLoading: boolean;
	dataError: string | null;
	lastOutputSig: string;
	diagnostic: Record<string, unknown> | null;
};

function computeProcessKey(input: ProcessKeyInput): string {
	return `${input.inputSig}|L:${input.isDataLoading ? 1 : 0}|E:${
		input.dataError ? String(input.dataError) : ""
	}|S:${input.lastOutputSig}|H:${input.diagnostic ? JSON.stringify(input.diagnostic) : "0"}`;
}

type SkipProcessingInput = {
	lastProcessKey: string;
	currentProcessKey: string;
	lastInputSig: string;
	currentInputSig: string;
	isDataLoading: boolean;
	dataError: string | null;
};

function shouldSkipProcessing(input: SkipProcessingInput): boolean {
	if (input.lastProcessKey === input.currentProcessKey) {
		return true;
	}
	if (
		input.lastInputSig === input.currentInputSig &&
		!input.isDataLoading &&
		!input.dataError
	) {
		return true;
	}
	return false;
}

/**
 * Custom hook for managing calendar events
 */
export function useCalendarEvents(
	options: UseCalendarEventsOptions
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

	// Prepare static processing options (age map is injected at call site below)
	const processingOptions = useMemo(
		(): Omit<
			ReservationProcessingOptions,
			"vacationPeriods" | "ageByWaId"
		> => ({
			freeRoam: options.freeRoam,
			isLocalized: options.isLocalized,
		}),
		[options.freeRoam, options.isLocalized]
	);

	/**
	 * Process calendar events from unified data
	 */
	const lastInputSigRef = useRef<string>("");
	const lastOutputSigRef = useRef<string>("");
	const lastProcessKeyRef = useRef<string>("");
	const sanitizedDiagnosticRef = useRef<Record<string, unknown> | null>(null);
	const emptyRunGuardRef = useRef<boolean>(false);

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: diagnostic logging + branching
	const processEvents = useCallback((): void => {
		try {
			const inputSig = computeDataSignatureImpl(
				(reservations || {}) as unknown as Record<string, unknown[]>,
				(conversations || {}) as unknown as Record<string, unknown[]>,
				(vacationPeriods || []) as unknown as unknown[],
				options.excludeConversations
			);

			// Update diagnostics
			sanitizedDiagnosticRef.current = computeDiagnosticsImpl({
				reservationsData: reservations,
				conversationsData: conversations,
				vacationsData: vacationPeriods,
				loading: isDataLoading,
				error: dataError,
			});

			const processKey = computeProcessKey({
				inputSig,
				isDataLoading,
				dataError,
				lastOutputSig: lastOutputSigRef.current ?? "",
				diagnostic: sanitizedDiagnosticRef.current,
			});

			if (process.env.NODE_ENV !== "production") {
				try {
					devGroup("Calendar process");
					devLog("loading", isDataLoading);
					devLog("error", dataError);
					devLog("diag", sanitizedDiagnosticRef.current);
					devLog("excludeConversations", options.excludeConversations ?? false);
					devLog("inputSig", inputSig);
					devGroupEnd();
				} catch {
					// ignore logging errors
				}
			}

			// Check if we should skip processing
			if (
				shouldSkipProcessing({
					lastProcessKey: lastProcessKeyRef.current,
					currentProcessKey: processKey,
					lastInputSig: lastInputSigRef.current,
					currentInputSig: inputSig,
					isDataLoading,
					dataError,
				})
			) {
				emptyRunGuardRef.current = false;
				lastProcessKeyRef.current = processKey;
				return;
			}

			const _t0 = profileTimeStart("processEvents", {});

			let nextEvents: CalendarEvent[] = state.events;
			let nextError: string | null = dataError || null;
			let nextLoading = isDataLoading;

			// Helper to generate processed events
			// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: diagnostic branching is verbose but temporary for debugging
			const generateProcessedEventsIfValid = () => {
				if (
					!validateProcessingInputsImpl({
						isDataLoading,
						dataError,
						reservations,
						vacationPeriods,
						conversations,
						excludeConversations: options.excludeConversations ?? false,
					})
				) {
					if (process.env.NODE_ENV !== "production") {
						try {
							devGroup("Calendar process:skipped");
							devLog("reasons", {
								isDataLoading,
								dataError,
								missingReservations: !reservations,
								missingVacations: !vacationPeriods,
								missingConversations: !(
									options.excludeConversations || conversations
								),
							});
							devGroupEnd();
						} catch {
							// ignore
						}
					}
					if (dataError) {
						nextLoading = false;
						nextError = dataError;
					}
					return;
				}

				const reservationEntries = buildReservationEntriesImpl(reservations);
				const processedEvents = eventProcessor.generateCalendarEvents(
					Object.fromEntries(reservationEntries) as Record<
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
						? ({} as Record<
								string,
								Array<{ id?: string; text?: string; ts?: string }>
							>)
						: (conversations as Record<
								string,
								Array<{ id?: string; text?: string; ts?: string }>
							>),
					{
						...processingOptions,
						vacationPeriods,
						...(options.ageByWaId ? { ageByWaId: options.ageByWaId } : {}),
					}
				);

				if (process.env.NODE_ENV !== "production") {
					try {
						devGroup("Calendar process:result");
						devLog("reservationEntries.count", reservationEntries.length);
						devLog("events.count", processedEvents.length);
						devGroupEnd();
					} catch {
						// ignore
					}
				}

				nextEvents = processedEvents;
				nextLoading = false;
				nextError = null;
			};

			generateProcessedEventsIfValid();

			const nextOutSig = computeEventsSignatureImpl(nextEvents);
			const shouldUpdateState =
				nextLoading !== state.loading ||
				nextError !== state.error ||
				nextOutSig !== lastOutputSigRef.current;

			if (shouldUpdateState) {
				setState((prev) => ({
					...prev,
					events: nextEvents,
					loading: nextLoading,
					error: nextError,
					lastUpdated: new Date(),
				}));
				lastOutputSigRef.current = nextOutSig;
				profileCount("events.processed", nextEvents.length, {});
			}

			lastInputSigRef.current = inputSig;
			lastProcessKeyRef.current = processKey;
			profileTimeEnd("processEvents", _t0, {
				loading: nextLoading,
				error: Boolean(nextError),
			});
		} catch (error) {
			setState((prev) => ({
				...prev,
				loading: false,
				error:
					error instanceof Error ? error.message : "Unknown error occurred",
				lastUpdated: new Date(),
			}));
		}
	}, [
		state.events,
		state.loading,
		state.error,
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
			await Promise.all([
				refreshReservations(),
				refreshConversations(),
				refreshVacations(),
			]);
			// processEvents will be called automatically via useEffect when data updates
		} catch {
			// Suppress errors during refresh
		}
	}, [refreshReservations, refreshConversations, refreshVacations]);

	/**
	 * Invalidate cache without refetching (kept for compatibility)
	 */
	const invalidateCache = useCallback((): void => {
		// No-op: cache invalidation not needed with real-time updates
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
					event.id === id ? { ...event, ...updatedEvent } : event
				),
				lastUpdated: new Date(),
			}));
		},
		[]
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

	// Auto-refresh removed: realtime WebSocket updates handle synchronization

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
