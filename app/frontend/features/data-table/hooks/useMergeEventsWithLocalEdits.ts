import type { RefObject } from "react";
import type { DataProvider } from "@/shared/libs/data-grid/components/core/services/DataProvider";

export type EventLike = {
  id?: string | number;
  start?: string | null;
  extendedProps?: Record<string, unknown> | null | undefined;
};

type ProviderLike = DataProvider & {
  getRowCount?: () => number;
  getColumnCount?: () => number;
  getEditingState?: () => {
    getNumRows?: () => number;
    getCell?: (c: number, r: number) => unknown;
  };
};

export function mergeEventsWithLocalEdits(params: {
  incomingEvents: EventLike[];
  previousEvents: EventLike[];
  provider: ProviderLike | null | undefined;
  gridRowToEventMapRef:
    | RefObject<Map<number, EventLike>>
    | { current?: Map<number, EventLike> }
    | null
    | undefined;
  getReservationKey: (ev: EventLike) => string;
  hasUnsavedChanges: boolean;
}): EventLike[] {
  const {
    incomingEvents,
    previousEvents,
    provider,
    gridRowToEventMapRef,
    getReservationKey,
    hasUnsavedChanges,
  } = params;

  try {
    if (!provider) {
      return incomingEvents;
    }
    if (!hasUnsavedChanges) {
      return incomingEvents;
    }

    const editingState = provider.getEditingState?.();
    const baseRowCount: number = provider.getRowCount?.() ?? 0;
    const totalRows: number = editingState?.getNumRows?.() ?? baseRowCount;
    const colCount: number = provider.getColumnCount?.() ?? 0;

    const editedRowSet = new Set<number>();
    for (let r = 0; r < totalRows; r += 1) {
      for (let c = 0; c < colCount; c += 1) {
        const cell = editingState?.getCell?.(c, r);
        if (cell !== undefined) {
          editedRowSet.add(r);
          break;
        }
      }
    }

    const blockedKeys = new Set<string>();
    try {
      const mapRef = gridRowToEventMapRef?.current as
        | Map<number, EventLike>
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
    } catch (_err) {
      /* ignore map extraction errors */
    }

    const prevMap = new Map<string, EventLike>();
    for (const ev of previousEvents || []) {
      const k = getReservationKey(ev);
      if (k) {
        prevMap.set(k, ev);
      }
    }

    const merged: EventLike[] = [];
    for (const ev of incomingEvents || []) {
      const k = getReservationKey(ev);
      if (k && blockedKeys.has(k)) {
        merged.push(prevMap.get(k) ?? ev);
      } else {
        merged.push(ev);
      }
    }

    for (const [k, oldEv] of prevMap.entries()) {
      if (blockedKeys.has(k)) {
        const stillExists = (incomingEvents || []).some(
          (ev) => getReservationKey(ev) === k
        );
        if (!stillExists) {
          merged.push(oldEv);
        }
      }
    }

    const seen = new Set<string>();
    const deduped: EventLike[] = [];
    for (const ev of merged) {
      const key = getReservationKey(ev);
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(ev);
      }
    }
    return deduped;
  } catch (_err) {
    // On failure, fall back to incoming events to avoid stale UI
    return incomingEvents;
  }
}
