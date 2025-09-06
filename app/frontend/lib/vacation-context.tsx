"use client";
import * as React from "react";
import { useVacationsData, type Vacation } from "@/lib/websocket-data-provider";

export interface VacationPeriod {
	start: Date;
	end: Date;
}

interface VacationContextValue {
	vacationPeriods: VacationPeriod[];
	recordingState: {
		periodIndex: number | null;
		field: string | null;
	};
	loading: boolean;
	addVacationPeriod: () => void;
	removeVacationPeriod: (index: number) => void;
	startRecording: (periodIndex: number, field: "start" | "end") => void;
	stopRecording: () => void;
	setOnVacationUpdated?: (fn: (periods: VacationPeriod[]) => void) => void;
	handleDateClick?: (date: Date) => void;
}

const VacationContext = React.createContext<VacationContextValue>({
	vacationPeriods: [],
	recordingState: { periodIndex: null, field: null },
	loading: false,
	addVacationPeriod: () => {},
	removeVacationPeriod: (_index: number) => {},
	startRecording: (_i: number, _f: "start" | "end") => {},
	stopRecording: () => {},
	setOnVacationUpdated: () => {},
	handleDateClick: () => {},
});

export const VacationProvider: React.FC<React.PropsWithChildren> = ({
	children,
}) => {
	const [vacationPeriods, setVacationPeriods] = React.useState<
		VacationPeriod[]
	>([]);
	const [recordingState, setRecordingState] = React.useState<{
		periodIndex: number | null;
		field: "start" | "end" | null;
	}>({ periodIndex: null, field: null });
	const [loading] = React.useState<boolean>(false);
	const vacationUpdatedRef = React.useRef<
		((periods: VacationPeriod[]) => void) | null
	>(null);
	const suppressSyncUntilRef = React.useRef<number>(0);
	const setOnVacationUpdated = (fn: (periods: VacationPeriod[]) => void) => {
		vacationUpdatedRef.current = fn;
	};
	// Sync with websocket-provided vacations
	const { vacations, sendVacationUpdate } = useVacationsData();
	React.useEffect(() => {
		try {
			// Guard against overwriting local optimistic updates immediately after user changes
			if (Date.now() < suppressSyncUntilRef.current) return;
			if (Array.isArray(vacations)) {
				const periods = vacations.map((p: Vacation) => ({
					start: new Date(p.start),
					end: new Date(p.end),
				}));
				setVacationPeriods(periods);
				vacationUpdatedRef.current?.(periods);
			}
		} catch {}
	}, [vacations]);

	const addVacationPeriod = React.useCallback(() => {
		// Add a 1-day period starting today by default
		const start = new Date();
		const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
		setVacationPeriods((prev) => {
			const next = [...prev, { start, end }];
			vacationUpdatedRef.current?.(next);
			try {
				sendVacationUpdate?.({
					periods: next.map((p) => ({ start: p.start, end: p.end })),
				});
			} catch {}
			// Suppress incoming sync briefly to avoid revert from stale snapshot
			suppressSyncUntilRef.current = Date.now() + 1500;
			return next;
		});
	}, [sendVacationUpdate]);

	const removeVacationPeriod = React.useCallback(
		(index: number) => {
			setVacationPeriods((prev) => {
				const next = prev.filter((_, i) => i !== index);
				vacationUpdatedRef.current?.(next);
				try {
					sendVacationUpdate?.({
						periods: next.map((p) => ({ start: p.start, end: p.end })),
					});
				} catch {}
				suppressSyncUntilRef.current = Date.now() + 1500;
				return next;
			});
		},
		[sendVacationUpdate],
	);

	const startRecording = React.useCallback(
		(periodIndex: number, field: "start" | "end") => {
			setRecordingState({ periodIndex, field });
		},
		[],
	);

	const stopRecording = React.useCallback(() => {
		setRecordingState({ periodIndex: null, field: null });
		try {
			sendVacationUpdate?.({
				periods: vacationPeriods.map((p) => ({ start: p.start, end: p.end })),
			});
		} catch {}
		suppressSyncUntilRef.current = Date.now() + 1500;
	}, [sendVacationUpdate, vacationPeriods]);

	const handleDateClick = React.useCallback(
		(date: Date) => {
			setVacationPeriods((prev) => {
				const idx = recordingState.periodIndex;
				const field = recordingState.field;
				if (idx == null || field == null || idx < 0 || idx >= prev.length)
					return prev;
				const normalized = new Date(
					date.getFullYear(),
					date.getMonth(),
					date.getDate(),
				);
				const next = [...prev];
				const current = { ...next[idx] };
				if (field === "start") {
					current.start = normalized;
					if (current.end && current.end < current.start)
						current.end = new Date(normalized);
				} else {
					current.end = normalized;
					if (current.start && current.start > current.end)
						current.start = new Date(normalized);
				}
				next[idx] = current as VacationPeriod;
				vacationUpdatedRef.current?.(next);
				try {
					sendVacationUpdate?.({
						periods: next.map((p) => ({ start: p.start, end: p.end })),
					});
				} catch {}
				suppressSyncUntilRef.current = Date.now() + 1500;
				return next;
			});
		},
		[recordingState.periodIndex, recordingState.field, sendVacationUpdate],
	);

	return (
		<VacationContext.Provider
			value={{
				vacationPeriods,
				recordingState,
				loading,
				addVacationPeriod,
				removeVacationPeriod,
				startRecording,
				stopRecording,
				setOnVacationUpdated,
				handleDateClick,
			}}
		>
			{children}
		</VacationContext.Provider>
	);
};

export const useVacation = (): VacationContextValue =>
	React.useContext(VacationContext);
