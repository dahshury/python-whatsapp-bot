"use client";
import { useVacationsData } from "@shared/libs/data/websocket-data-provider";
import { useLanguage } from "@shared/libs/state/language-context";
import {
	findNextFreeDate,
	normalizeDate,
	parseDateOnly,
	resolveOverlaps,
} from "@shared/libs/state/vacation-utils";
import { useVacationEditorStore } from "@shared/libs/store/vacation-editor-store";
import {
	createContext,
	type FC,
	type PropsWithChildren,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import type { CalendarEvent } from "@/entities/event";
import type { Vacation } from "@/entities/vacation";
import { i18n } from "@/shared/libs/i18n";

// Constants for vacation period management
const SYNC_SUPPRESSION_DURATION_MS = 2500;
const MAX_OVERLAP_RESOLUTION_ITERATIONS = 64;

export type VacationPeriod = {
	start: Date;
	end: Date;
};

type VacationContextValue = {
	vacationPeriods: VacationPeriod[];
	vacationEvents: CalendarEvent[]; // Generated calendar events for vacation periods
	recordingState: {
		periodIndex: number | null;
		field: string | null;
	};
	loading: boolean;
	addVacationPeriod: () => void;
	removeVacationPeriod: (index: number) => void;
	startRecording: (periodIndex: number, field: "start" | "end") => void;
	stopRecording: () => void;
	handleDateClick?: (date: Date) => void;
};

const VacationContext = createContext<VacationContextValue>({
	vacationPeriods: [],
	vacationEvents: [],
	recordingState: { periodIndex: null, field: null },
	loading: false,
	addVacationPeriod: () => {
		// Default no-op implementation
	},
	removeVacationPeriod: (_index: number) => {
		// Default no-op implementation
	},
	startRecording: (_i: number, _f: "start" | "end") => {
		// Default no-op implementation
	},
	stopRecording: () => {
		// Default no-op implementation
	},
	handleDateClick: () => {
		// Default no-op implementation
	},
});

export const VacationProvider: FC<PropsWithChildren> = ({ children }) => {
	const vacationPeriods = useVacationEditorStore((s) => s.vacationPeriods);
	const setVacationPeriods = useVacationEditorStore(
		(s) => s.setVacationPeriods
	);
	const recordingState = useVacationEditorStore((s) => s.recordingState);
	const startRecordingStore = useVacationEditorStore((s) => s.startRecording);
	const stopRecordingStore = useVacationEditorStore((s) => s.stopRecording);
	const setSuppressSyncUntil = useVacationEditorStore(
		(s) => s.setSuppressSyncUntil
	);
	const suppressSyncUntil = useVacationEditorStore((s) => s.suppressSyncUntil);
	const [loading] = useState<boolean>(false);
	// Sync with websocket-provided vacations
	const { vacations, sendVacationUpdate } = useVacationsData();

	useEffect(() => {
		try {
			const now = Date.now();
			const isSuppressed = now < suppressSyncUntil;
			if (isSuppressed) {
				return;
			}
			if (Array.isArray(vacations)) {
				const periods = vacations.map((p: Vacation) => ({
					start: parseDateOnly(p.start),
					end: parseDateOnly(p.end),
				}));
				setVacationPeriods(periods);
			}
		} catch (_error) {
			// Gracefully handle vacation parsing errors; fall back to empty periods
		}
	}, [vacations, suppressSyncUntil, setVacationPeriods]);

	const addVacationPeriod = useCallback(() => {
		const today = normalizeDate(new Date());
		const freeDay = findNextFreeDate(today, vacationPeriods);
		const next = [...vacationPeriods, { start: freeDay, end: freeDay }];
		setVacationPeriods(next);
		try {
			sendVacationUpdate?.({
				periods: next.map((p) => ({ start: p.start, end: p.end })),
			});
		} catch {
			// Gracefully handle vacation update errors
		}
		setSuppressSyncUntil(Date.now() + SYNC_SUPPRESSION_DURATION_MS);
	}, [
		sendVacationUpdate,
		vacationPeriods,
		setVacationPeriods,
		setSuppressSyncUntil,
	]);

	const removeVacationPeriod = useCallback(
		(index: number) => {
			const next = vacationPeriods.filter((_, i) => i !== index);
			setVacationPeriods(next);
			try {
				sendVacationUpdate?.({
					periods: next.map((p) => ({ start: p.start, end: p.end })),
				});
			} catch {
				// Gracefully handle vacation update errors
			}
			setSuppressSyncUntil(Date.now() + SYNC_SUPPRESSION_DURATION_MS);
		},
		[
			sendVacationUpdate,
			vacationPeriods,
			setVacationPeriods,
			setSuppressSyncUntil,
		]
	);

	const startRecording = useCallback(
		(periodIndex: number, field: "start" | "end") => {
			startRecordingStore(periodIndex, field);
		},
		[startRecordingStore]
	);

	const stopRecording = useCallback(() => {
		stopRecordingStore();
		try {
			sendVacationUpdate?.({
				periods: vacationPeriods.map((p) => ({ start: p.start, end: p.end })),
			});
		} catch {
			// Gracefully handle vacation update errors
		}
		setSuppressSyncUntil(Date.now() + SYNC_SUPPRESSION_DURATION_MS);
	}, [
		sendVacationUpdate,
		vacationPeriods,
		stopRecordingStore,
		setSuppressSyncUntil,
	]);

	const handleDateClick = useCallback(
		(date: Date) => {
			const idx = recordingState.periodIndex;
			const field = recordingState.field;
			if (
				idx == null ||
				field == null ||
				idx < 0 ||
				idx >= vacationPeriods.length
			) {
				return;
			}

			const next = [...vacationPeriods];
			const current = { ...next[idx] } as VacationPeriod;
			const chosen = normalizeDate(date);

			// Update selected edge
			updatePeriodEdge(current, chosen, field);

			// Resolve overlaps with other periods
			resolveOverlaps(current, next, {
				currentIndex: idx,
				editingField: field,
				maxIterations: MAX_OVERLAP_RESOLUTION_ITERATIONS,
			});

			next[idx] = current;
			setVacationPeriods(next);

			try {
				sendVacationUpdate?.({
					periods: next.map((p) => ({ start: p.start, end: p.end })),
				});
			} catch {
				// Gracefully handle vacation update errors
			}
			setSuppressSyncUntil(Date.now() + SYNC_SUPPRESSION_DURATION_MS);

			// Stop recording after capturing the date (defer to allow outside-click prevention)
			setTimeout(() => stopRecordingStore(), 0);
		},
		[
			recordingState.periodIndex,
			recordingState.field,
			vacationPeriods,
			setVacationPeriods,
			sendVacationUpdate,
			stopRecordingStore,
			setSuppressSyncUntil,
		]
	);

	const { isLocalized } = useLanguage();

	// Convert vacation periods to calendar events
	const vacationEvents = useMemo(() => {
		const toDateOnly = (d: Date) => {
			const yyyy = d.getFullYear();
			const mm = String(d.getMonth() + 1).padStart(2, "0");
			const dd = String(d.getDate()).padStart(2, "0");
			return `${yyyy}-${mm}-${dd}`;
		};
		const addDays = (d: Date, n: number) =>
			new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

		const events: CalendarEvent[] = [];

		vacationPeriods.forEach((period, index) => {
			// Split multi-day spans into per-day background/text events for robust rendering
			const start = normalizeDate(period.start);
			const end = normalizeDate(period.end);
			for (
				let cur = new Date(
					start.getFullYear(),
					start.getMonth(),
					start.getDate()
				);
				cur.getTime() <= end.getTime();
				cur = addDays(cur, 1)
			) {
				const dayStartStr = toDateOnly(cur);
				const dayEndStr = toDateOnly(addDays(cur, 1));

				// Background day overlay
				events.push({
					id: `vacation-${index}-${dayStartStr}`,
					title: `${i18n.getMessage("vacation", isLocalized)} ${index + 1}`,
					start: dayStartStr,
					end: dayEndStr, // exclusive end (next day)
					allDay: true,
					display: "background",
					overlap: false,
					editable: false,
					className: ["vacation-background-event"],
					backgroundColor: "#ff6600",
					borderColor: "#ff6600",
					textColor: "transparent",
					extendedProps: {
						__vacation: true,
						isVacationPeriod: true,
						vacationIndex: index,
						type: 99,
					},
				});

				// Optional: per-day centered text overlay
				events.push({
					id: `vacation-label-${index}-${dayStartStr}`,
					title: `${i18n.getMessage("vacation", isLocalized)} ${index + 1}`,
					start: dayStartStr,
					end: dayEndStr,
					allDay: true,
					overlap: false,
					editable: false,
					className: ["vacation-text-event"],
					extendedProps: {
						__vacation: true,
						isVacationPeriod: true,
						vacationIndex: index,
						isVacationText: true,
						type: 99,
					},
				});
			}
		});

		return events;
	}, [vacationPeriods, isLocalized]);

	return (
		<VacationContext.Provider
			value={{
				vacationPeriods,
				vacationEvents,
				recordingState,
				loading,
				addVacationPeriod,
				removeVacationPeriod,
				startRecording,
				stopRecording,
				handleDateClick,
			}}
		>
			{children}
		</VacationContext.Provider>
	);
};

export const useVacation = (): VacationContextValue =>
	useContext(VacationContext);

// Helper function to update a period edge (start or end)
function updatePeriodEdge(
	period: VacationPeriod,
	date: Date,
	field: "start" | "end"
): void {
	if (field === "start") {
		period.start = date;
		if (period.end && period.end < period.start) {
			period.end = new Date(period.start);
		}
	} else {
		period.end = date;
		if (period.start && period.start > period.end) {
			period.start = new Date(period.end);
		}
	}
}
