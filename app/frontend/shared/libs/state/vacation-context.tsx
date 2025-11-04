'use client'
import { useVacationsData } from '@shared/libs/data/websocket-data-provider'
import { useLanguage } from '@shared/libs/state/language-context'
import {
	createContext,
	type FC,
	type PropsWithChildren,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import type { CalendarEvent } from '@/entities/event'
import type { Vacation } from '@/entities/vacation'
import { i18n } from '@/shared/libs/i18n'

// Suppression window duration in milliseconds
const SUPPRESS_SYNC_MS = 2500

// Maximum overlap resolution iterations
const MAX_OVERLAP_RESOLUTION_ITERATIONS = 64

export type VacationPeriod = {
	start: Date
	end: Date
}

type VacationContextValue = {
	vacationPeriods: VacationPeriod[]
	vacationEvents: CalendarEvent[] // Generated calendar events for vacation periods
	recordingState: {
		periodIndex: number | null
		field: string | null
	}
	loading: boolean
	addVacationPeriod: () => void
	removeVacationPeriod: (index: number) => void
	startRecording: (periodIndex: number, field: 'start' | 'end') => void
	stopRecording: () => void
	handleDateClick?: (date: Date) => void
}

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
	startRecording: (_i: number, _f: 'start' | 'end') => {
		// Default no-op implementation
	},
	stopRecording: () => {
		// Default no-op implementation
	},
	handleDateClick: () => {
		// Default no-op implementation
	},
})

export const VacationProvider: FC<PropsWithChildren> = ({ children }) => {
	const [vacationPeriods, setVacationPeriods] = useState<VacationPeriod[]>([])
	const [recordingState, setRecordingState] = useState<{
		periodIndex: number | null
		field: 'start' | 'end' | null
	}>({ periodIndex: null, field: null })
	const [loading] = useState<boolean>(false)
	const suppressSyncUntilRef = useRef<number>(0)
	// Sync with websocket-provided vacations
	const { vacations, sendVacationUpdate } = useVacationsData()
	useEffect(() => {
		try {
			const now = Date.now()
			const suppressUntil = suppressSyncUntilRef.current
			const isSuppressed = now < suppressUntil

			// Guard against overwriting local optimistic updates immediately after user changes
			if (isSuppressed) {
				return
			}

			if (Array.isArray(vacations)) {
				// Parse backend-provided dates as DATE-ONLY to avoid timezone shifts
				// that could exclude the selected end day in some locales.
				const parseDateOnly = (value: string): Date => {
					try {
						const s = String(value || '')
						const dateOnly = s.includes('T') ? s.slice(0, 10) : s
						const parts = dateOnly.split('-')
						const y = Number.parseInt(parts[0] || '', 10)
						const m = Number.parseInt(parts[1] || '', 10)
						const d = Number.parseInt(parts[2] || '', 10)
						if (
							Number.isFinite(y) &&
							Number.isFinite(m) &&
							Number.isFinite(d)
						) {
							return new Date(y, m - 1, d)
						}
						// Fallback: construct then normalize to local date-only
						const tmp = new Date(value)
						return new Date(tmp.getFullYear(), tmp.getMonth(), tmp.getDate())
					} catch {
						const tmp = new Date(value)
						return new Date(tmp.getFullYear(), tmp.getMonth(), tmp.getDate())
					}
				}

				const periods = vacations.map((p: Vacation) => ({
					start: parseDateOnly(p.start),
					end: parseDateOnly(p.end),
				}))

				setVacationPeriods(periods)
			}
		} catch {
			// Vacation sync failed - keep existing periods
		}
	}, [vacations])

	const addVacationPeriod = useCallback(() => {
		// Utilities for date normalization and search
		const normalize = (d: Date) =>
			new Date(d.getFullYear(), d.getMonth(), d.getDate())
		const isInPeriod = (d: Date, p: { start: Date; end: Date }) => {
			const dd = normalize(d).getTime()
			const s = normalize(p.start).getTime()
			const e = normalize(p.end).getTime()
			return dd >= s && dd <= e
		}
		const findNextFreeDate = (startDate: Date, periods: VacationPeriod[]) => {
			let candidate = normalize(startDate)
			while (periods.some((p) => isInPeriod(candidate, p))) {
				// Jump to the day after the latest overlapping period's end
				let maxEnd = candidate
				for (const p of periods) {
					if (isInPeriod(candidate, p)) {
						const endN = normalize(p.end)
						if (endN.getTime() > maxEnd.getTime()) {
							maxEnd = endN
						}
					}
				}
				candidate = new Date(
					maxEnd.getFullYear(),
					maxEnd.getMonth(),
					maxEnd.getDate() + 1
				)
			}
			return candidate
		}

		setVacationPeriods((prev) => {
			const today = normalize(new Date())
			const freeDay = findNextFreeDate(today, prev)
			const next = [...prev, { start: freeDay, end: freeDay }]
			try {
				sendVacationUpdate?.({
					periods: next.map((p) => ({ start: p.start, end: p.end })),
				})
			} catch {
				// Vacation update send failed - local state still updated
			}
			suppressSyncUntilRef.current = Date.now() + SUPPRESS_SYNC_MS
			return next
		})
	}, [sendVacationUpdate])

	const removeVacationPeriod = useCallback(
		(index: number) => {
			setVacationPeriods((prev) => {
				const next = prev.filter((_, i) => i !== index)

				// Immediately update calendar with removed vacation period

				try {
					sendVacationUpdate?.({
						periods: next.map((p) => ({ start: p.start, end: p.end })),
					})
				} catch {
					// Vacation update send failed - local state still updated
				}
				suppressSyncUntilRef.current = Date.now() + SUPPRESS_SYNC_MS
				return next
			})
		},
		[sendVacationUpdate]
	)

	const startRecording = useCallback(
		(periodIndex: number, field: 'start' | 'end') => {
			setRecordingState({ periodIndex, field })
		},
		[]
	)

	const stopRecording = useCallback(() => {
		setRecordingState({ periodIndex: null, field: null })
		try {
			sendVacationUpdate?.({
				periods: vacationPeriods.map((p) => ({ start: p.start, end: p.end })),
			})
		} catch {
			// Vacation update send failed - local state still updated
		}
		suppressSyncUntilRef.current = Date.now() + SUPPRESS_SYNC_MS
	}, [sendVacationUpdate, vacationPeriods])

	const handleDateClick = useCallback(
		(date: Date) => {
			setVacationPeriods((prev) => {
				const idx = recordingState.periodIndex
				const field = recordingState.field
				if (idx == null || field == null || idx < 0 || idx >= prev.length) {
					return prev
				}

				const normalize = (d: Date) =>
					new Date(d.getFullYear(), d.getMonth(), d.getDate())
				const dayAfter = (d: Date) =>
					new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
				const dayBefore = (d: Date) =>
					new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1)
				const overlaps = (
					a: { start: Date; end: Date },
					b: { start: Date; end: Date }
				) => {
					const s1 = normalize(a.start).getTime()
					const e1 = normalize(a.end).getTime()
					const s2 = normalize(b.start).getTime()
					const e2 = normalize(b.end).getTime()
					return Math.max(s1, s2) <= Math.min(e1, e2)
				}

				const next = [...prev]
				const current = { ...next[idx] } as VacationPeriod
				const chosen = normalize(date)

				if (field === 'start') {
					current.start = chosen
					if (current.end && current.end < current.start) {
						current.end = new Date(current.start)
					}
				} else {
					current.end = chosen
					if (current.start && current.start > current.end) {
						current.start = new Date(current.end)
					}
				}

				// Resolve overlaps deterministically by clamping the edited edge
				let changed = true
				let safety = 0
				while (changed && safety < MAX_OVERLAP_RESOLUTION_ITERATIONS) {
					changed = false
					safety += 1
					for (let k = 0; k < next.length; k += 1) {
						if (k === idx) {
							continue
						}
						const other = next[k]
						if (!(other && overlaps(current, other))) {
							continue
						}

						if (field === 'start') {
							// Move start to the day after the overlapping other's end
							current.start = dayAfter(other.end)
							if (current.end < current.start) {
								current.end = new Date(current.start)
							}
							changed = true
							break
						}
						// Move end to the day before the overlapping other's start
						current.end = dayBefore(other.start)
						if (current.end < current.start) {
							current.start = new Date(current.end)
						}
						changed = true
						break
					}
				}

				next[idx] = current

				try {
					sendVacationUpdate?.({
						periods: next.map((p) => ({ start: p.start, end: p.end })),
					})
				} catch {
					// Vacation update send failed - local state still updated
				}
				suppressSyncUntilRef.current = Date.now() + SUPPRESS_SYNC_MS
				return next
			})

			// Stop recording after capturing the date (defer to allow outside-click prevention)
			setTimeout(() => setRecordingState({ periodIndex: null, field: null }), 0)
		},
		[recordingState.periodIndex, recordingState.field, sendVacationUpdate]
	)

	const { isLocalized } = useLanguage()

	// Convert vacation periods to calendar events
	const vacationEvents = useMemo(() => {
		const toDateOnly = (d: Date) => {
			const yyyy = d.getFullYear()
			const mm = String(d.getMonth() + 1).padStart(2, '0')
			const dd = String(d.getDate()).padStart(2, '0')
			return `${yyyy}-${mm}-${dd}`
		}
		const addDays = (d: Date, n: number) =>
			new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
		const normalize = (d: Date) =>
			new Date(d.getFullYear(), d.getMonth(), d.getDate())

		const events: CalendarEvent[] = []
		const baseVacationTitle = i18n.getMessage('vacation', isLocalized)

		vacationPeriods.forEach((period, index) => {
			// Split multi-day spans into per-day background/text events for robust rendering
			const start = normalize(period.start)
			const end = normalize(period.end)
			for (
				let cur = new Date(
					start.getFullYear(),
					start.getMonth(),
					start.getDate()
				);
				cur.getTime() <= end.getTime();
				cur = addDays(cur, 1)
			) {
				const dayStartStr = toDateOnly(cur)
				const dayEndStr = toDateOnly(addDays(cur, 1))

				// Background day overlay
				events.push({
					id: `vacation-${index}-${dayStartStr}`,
					title: baseVacationTitle,
					start: dayStartStr,
					end: dayEndStr, // exclusive end (next day)
					allDay: true,
					display: 'background',
					overlap: false,
					editable: false,
					className: ['vacation-background-event', 'vacation-event'],
					extendedProps: {
						__vacation: true,
						isVacationPeriod: true,
						vacationIndex: index,
						type: 99,
					},
				})
			}
		})

		return events
	}, [vacationPeriods, isLocalized])

	const contextValue = useMemo(
		() => ({
			vacationPeriods,
			vacationEvents,
			recordingState,
			loading,
			addVacationPeriod,
			removeVacationPeriod,
			startRecording,
			stopRecording,
			handleDateClick,
		}),
		[
			vacationPeriods,
			vacationEvents,
			recordingState,
			loading,
			addVacationPeriod,
			removeVacationPeriod,
			startRecording,
			stopRecording,
			handleDateClick,
		]
	)

	return (
		<VacationContext.Provider value={contextValue}>
			{children}
		</VacationContext.Provider>
	)
}

export const useVacation = (): VacationContextValue =>
	useContext(VacationContext)
