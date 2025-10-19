import type { CalendarEvent as DataTableCalendarEvent } from "@widgets/data-table-editor/types";
import React from "react";

type Provider = {
	getEditingState?: () => {
		getNumRows?: () => number;
		getCell?: (c: number, r: number) => unknown;
	};
	getRowCount?: () => number;
	getColumnCount?: () => number;
};

type Args = {
	events: DataTableCalendarEvent[];
	open: boolean;
	dataProviderRef: React.RefObject<Provider | null>;
	gridRowToEventMapRef?: React.RefObject<Map<
		number,
		DataTableCalendarEvent
	> | null>;
	hasUnsavedChanges: () => boolean;
	getReservationKey: (ev: DataTableCalendarEvent) => string;
};

function findEditedRows(
	editingState:
		| { getCell?: (c: number, r: number) => unknown; getNumRows?: () => number }
		| undefined,
	totalRows: number,
	colCount: number
): Set<number> {
	const editedRowSet = new Set<number>();
	for (let r = 0; r < totalRows; r++) {
		for (let c = 0; c < colCount; c++) {
			if (editingState?.getCell?.(c, r) !== undefined) {
				editedRowSet.add(r);
				break;
			}
		}
	}
	return editedRowSet;
}

function buildBlockedKeys(
	gridRowToEventMapRef: Args["gridRowToEventMapRef"],
	baseRowCount: number,
	editedRowSet: Set<number>,
	getReservationKey: (ev: DataTableCalendarEvent) => string
): Set<string> {
	const blockedKeys = new Set<string>();
	try {
		const mapRef = gridRowToEventMapRef?.current as
			| Map<number, DataTableCalendarEvent>
			| undefined;
		if (mapRef && mapRef.size > 0) {
			for (const [rowIndex, ev] of mapRef.entries()) {
				if (rowIndex < baseRowCount && editedRowSet.has(rowIndex)) {
					const key = getReservationKey(ev);
					if (key) {
						blockedKeys.add(key);
					}
				}
			}
		}
	} catch {
		// Failed to extract blocked keys; will proceed with empty set
	}
	return blockedKeys;
}

function deduplicateEvents(
	merged: DataTableCalendarEvent[],
	getReservationKey: (ev: DataTableCalendarEvent) => string
): DataTableCalendarEvent[] {
	const seen = new Set<string>();
	const deduped: DataTableCalendarEvent[] = [];
	for (const ev of merged) {
		const key = getReservationKey(ev);
		if (!seen.has(key)) {
			seen.add(key);
			deduped.push(ev);
		}
	}
	return deduped;
}

function mergeEventLists(
	events: DataTableCalendarEvent[],
	previousEvents: DataTableCalendarEvent[],
	blockedKeys: Set<string>,
	getReservationKey: (ev: DataTableCalendarEvent) => string
): DataTableCalendarEvent[] {
	const prevMap = new Map<string, DataTableCalendarEvent>();
	for (const ev of previousEvents) {
		const k = getReservationKey(ev);
		if (k) {
			prevMap.set(k, ev);
		}
	}

	const merged: DataTableCalendarEvent[] = [];
	for (const ev of events) {
		const k = getReservationKey(ev);
		if (k && blockedKeys.has(k)) {
			merged.push(prevMap.get(k) ?? ev);
		} else {
			merged.push(ev);
		}
	}

	for (const [k, oldEv] of prevMap.entries()) {
		if (blockedKeys.has(k)) {
			const stillExists = events.some((ev) => getReservationKey(ev) === k);
			if (!stillExists) {
				merged.push(oldEv);
			}
		}
	}

	return merged;
}

export function useStableSourceEvents({
	events,
	open,
	dataProviderRef,
	gridRowToEventMapRef,
	hasUnsavedChanges,
	getReservationKey,
}: Args) {
	const [sourceEvents, setSourceEvents] =
		React.useState<DataTableCalendarEvent[]>(events);
	const previousEventsRef = React.useRef<DataTableCalendarEvent[]>(events);
	const hasUnsavedChangesRef = React.useRef(hasUnsavedChanges);
	const getReservationKeyRef = React.useRef(getReservationKey);

	React.useEffect(() => {
		hasUnsavedChangesRef.current = hasUnsavedChanges;
	}, [hasUnsavedChanges]);

	React.useEffect(() => {
		getReservationKeyRef.current = getReservationKey;
	}, [getReservationKey]);

	React.useEffect(() => {
		previousEventsRef.current = sourceEvents;
	}, [sourceEvents]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: gridRowToEventMapRef intentionally omitted to prevent infinite loops
	React.useLayoutEffect(() => {
		try {
			if (!open) {
				setSourceEvents(events);
				return;
			}

			const provider = dataProviderRef.current;
			if (!provider) {
				setSourceEvents(events);
				return;
			}

			if (!hasUnsavedChangesRef.current()) {
				setSourceEvents(events);
				return;
			}

			const editingState = provider.getEditingState?.();
			const baseRowCount = provider.getRowCount?.() ?? 0;
			const totalRows = editingState?.getNumRows?.() ?? baseRowCount;
			const colCount = provider.getColumnCount?.() ?? 0;

			const editedRowSet = findEditedRows(editingState, totalRows, colCount);
			const blockedKeys = buildBlockedKeys(
				gridRowToEventMapRef,
				baseRowCount,
				editedRowSet,
				getReservationKeyRef.current
			);

			const merged = mergeEventLists(
				events,
				previousEventsRef.current,
				blockedKeys,
				getReservationKeyRef.current
			);

			const deduped = deduplicateEvents(merged, getReservationKeyRef.current);
			setSourceEvents(deduped);
		} catch {
			setSourceEvents(events);
		}
	}, [events, open, dataProviderRef]);

	return { sourceEvents } as const;
}
