"use client";
import * as React from "react";
import { i18n } from "@/lib/i18n";
import { useLanguage } from "@/lib/language-context";
import { useVacationsData, type Vacation } from "@/lib/websocket-data-provider";
import type { CalendarEvent } from "@/types/calendar";

export interface VacationPeriod {
	start: Date;
	end: Date;
}

interface VacationContextValue {
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
}

const VacationContext = React.createContext<VacationContextValue>({
	vacationPeriods: [],
	vacationEvents: [],
	recordingState: { periodIndex: null, field: null },
	loading: false,
	addVacationPeriod: () => {},
	removeVacationPeriod: (_index: number) => {},
	startRecording: (_i: number, _f: "start" | "end") => {},
	stopRecording: () => {},
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
	const suppressSyncUntilRef = React.useRef<number>(0);
	// Sync with websocket-provided vacations
	const { vacations, sendVacationUpdate } = useVacationsData();
	React.useEffect(() => {
		try {
			const now = Date.now();
			const suppressUntil = suppressSyncUntilRef.current;
			const isSuppressed = now < suppressUntil;

			// Guard against overwriting local optimistic updates immediately after user changes
			if (isSuppressed) return;

			if (Array.isArray(vacations)) {
				// Parse backend-provided dates as DATE-ONLY to avoid timezone shifts
				// that could exclude the selected end day in some locales.
				const parseDateOnly = (value: string): Date => {
					try {
						const s = String(value || "");
						const dateOnly = s.includes("T") ? s.slice(0, 10) : s;
						const parts = dateOnly.split("-");
						const y = Number.parseInt(parts[0] || "", 10);
						const m = Number.parseInt(parts[1] || "", 10);
						const d = Number.parseInt(parts[2] || "", 10);
						if (
							Number.isFinite(y) &&
							Number.isFinite(m) &&
							Number.isFinite(d)
						) {
							return new Date(y, m - 1, d);
						}
						// Fallback: construct then normalize to local date-only
						const tmp = new Date(value);
						return new Date(tmp.getFullYear(), tmp.getMonth(), tmp.getDate());
					} catch {
						const tmp = new Date(value);
						return new Date(tmp.getFullYear(), tmp.getMonth(), tmp.getDate());
					}
				};

				const periods = vacations.map((p: Vacation) => ({
					start: parseDateOnly(p.start),
					end: parseDateOnly(p.end),
				}));

				setVacationPeriods(periods);
			}
		} catch (error) {
			console.error("❌ [VACATION-CONTEXT] Error in websocket sync:", error);
		}
	}, [vacations]);

	const addVacationPeriod = React.useCallback(() => {
		// Utilities for date normalization and search
		const normalize = (d: Date) =>
			new Date(d.getFullYear(), d.getMonth(), d.getDate());
		const isInPeriod = (d: Date, p: { start: Date; end: Date }) => {
			const dd = normalize(d).getTime();
			const s = normalize(p.start).getTime();
			const e = normalize(p.end).getTime();
			return dd >= s && dd <= e;
		};
		const findNextFreeDate = (startDate: Date, periods: VacationPeriod[]) => {
			let candidate = normalize(startDate);
			while (periods.some((p) => isInPeriod(candidate, p))) {
				// Jump to the day after the latest overlapping period's end
				let maxEnd = candidate;
				for (const p of periods) {
					if (isInPeriod(candidate, p)) {
						const endN = normalize(p.end);
						if (endN.getTime() > maxEnd.getTime()) maxEnd = endN;
					}
				}
				candidate = new Date(
					maxEnd.getFullYear(),
					maxEnd.getMonth(),
					maxEnd.getDate() + 1,
				);
			}
			return candidate;
		};

		setVacationPeriods((prev) => {
			const today = normalize(new Date());
			const freeDay = findNextFreeDate(today, prev);
			const next = [...prev, { start: freeDay, end: freeDay }];
			try {
				sendVacationUpdate?.({
					periods: next.map((p) => ({ start: p.start, end: p.end })),
				});
			} catch {}
			suppressSyncUntilRef.current = Date.now() + 2500;
			return next;
		});
	}, [sendVacationUpdate]);

	const removeVacationPeriod = React.useCallback(
		(index: number) => {
			setVacationPeriods((prev) => {
				const next = prev.filter((_, i) => i !== index);

				// Immediately update calendar with removed vacation period

				try {
					sendVacationUpdate?.({
						periods: next.map((p) => ({ start: p.start, end: p.end })),
					});
				} catch {}
				suppressSyncUntilRef.current = Date.now() + 2500;
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
		suppressSyncUntilRef.current = Date.now() + 2500;
	}, [sendVacationUpdate, vacationPeriods]);

	const handleDateClick = React.useCallback(
		(date: Date) => {
			setVacationPeriods((prev) => {
				const idx = recordingState.periodIndex;
				const field = recordingState.field;
				if (idx == null || field == null || idx < 0 || idx >= prev.length)
					return prev;

				const normalize = (d: Date) =>
					new Date(d.getFullYear(), d.getMonth(), d.getDate());
				const dayAfter = (d: Date) =>
					new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
				const dayBefore = (d: Date) =>
					new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
				const overlaps = (
					a: { start: Date; end: Date },
					b: { start: Date; end: Date },
				) => {
					const s1 = normalize(a.start).getTime();
					const e1 = normalize(a.end).getTime();
					const s2 = normalize(b.start).getTime();
					const e2 = normalize(b.end).getTime();
					return Math.max(s1, s2) <= Math.min(e1, e2);
				};

				const next = [...prev];
				const current = { ...next[idx] } as VacationPeriod;
				const chosen = normalize(date);

				if (field === "start") {
					current.start = chosen;
					if (current.end && current.end < current.start)
						current.end = new Date(current.start);
				} else {
					current.end = chosen;
					if (current.start && current.start > current.end)
						current.start = new Date(current.end);
				}

				// Resolve overlaps deterministically by clamping the edited edge
				let changed = true;
				let safety = 0;
				while (changed && safety < 64) {
					changed = false;
					safety += 1;
					for (let k = 0; k < next.length; k++) {
						if (k === idx) continue;
						const other = next[k];
						if (!other || !overlaps(current, other)) continue;

						if (field === "start") {
							// Move start to the day after the overlapping other's end
							current.start = dayAfter(other.end);
							if (current.end < current.start)
								current.end = new Date(current.start);
							changed = true;
							break;
						}
						// Move end to the day before the overlapping other's start
						current.end = dayBefore(other.start);
						if (current.end < current.start)
							current.start = new Date(current.end);
						changed = true;
						break;
					}
				}

				next[idx] = current;

				try {
					sendVacationUpdate?.({
						periods: next.map((p) => ({ start: p.start, end: p.end })),
					});
				} catch {}
				suppressSyncUntilRef.current = Date.now() + 2500;
				return next;
			});

			// Stop recording after capturing the date (defer to allow outside-click prevention)
			setTimeout(
				() => setRecordingState({ periodIndex: null, field: null }),
				0,
			);
		},
		[recordingState.periodIndex, recordingState.field, sendVacationUpdate],
	);

	const { isLocalized } = useLanguage();

	// Convert vacation periods to calendar events
	const vacationEvents = React.useMemo(() => {
		const toDateOnly = (d: Date) => {
			const yyyy = d.getFullYear();
			const mm = String(d.getMonth() + 1).padStart(2, "0");
			const dd = String(d.getDate()).padStart(2, "0");
			return `${yyyy}-${mm}-${dd}`;
		};
		const addDays = (d: Date, n: number) =>
			new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
		const normalize = (d: Date) =>
			new Date(d.getFullYear(), d.getMonth(), d.getDate());

		const events: CalendarEvent[] = [];

		vacationPeriods.forEach((period, index) => {
			// Split multi-day spans into per-day background/text events for robust rendering
			const start = normalize(period.start);
			const end = normalize(period.end);
			for (
				let cur = new Date(
					start.getFullYear(),
					start.getMonth(),
					start.getDate(),
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
				} as CalendarEvent);

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
				} as CalendarEvent);
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
	React.useContext(VacationContext);
