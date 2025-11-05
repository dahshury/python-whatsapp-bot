import type { DataEditorRef } from "@glideapps/glide-data-grid";
import React from "react";

type UseGridRefreshParams = {
  isInitializing: boolean;
  isDataReady: boolean;
  displayColumnsLength: number;
  filteredRowCount: number;
  dataEditorRef: React.RefObject<DataEditorRef | null>;
  /** Optional: when provided, will refresh cells for columns whose format changed */
  columnFormats?: Record<string, string>;
  /** Optional key to trigger full redraw when geometry changes */
  geometryKey?: unknown;
};

/**
 * Consolidates grid-wide refresh logic:
 * - Performs a targeted full visible cell redraw on geometry changes
 * - Invalidates cells for columns whose format changed
 */
export function useGridRefresh(params: UseGridRefreshParams): void {
  const {
    isInitializing,
    isDataReady,
    displayColumnsLength,
    filteredRowCount,
    dataEditorRef,
    columnFormats,
    geometryKey: _geometryKey,
  } = params;

  const prevFormatsRef = React.useRef<Record<string, string>>({});

  const refreshCells = React.useCallback(
    (cells: { cell: [number, number] }[]) => {
      try {
        dataEditorRef.current?.updateCells(cells);
      } catch {
        /* noop */
      }
    },
    [dataEditorRef]
  );

  // Geometry-driven redraw (e.g., column count/width changes or row count changes)
  React.useEffect(() => {
    if (!isDataReady) {
      return;
    }
    try {
      const cells: { cell: [number, number] }[] = [];
      for (let c = 0; c < displayColumnsLength; c += 1) {
        for (let r = 0; r < filteredRowCount; r += 1) {
          cells.push({ cell: [c as number, r as number] });
        }
      }
      const REDRAW_DELAY_MS = 30;
      const t = setTimeout(() => refreshCells(cells), REDRAW_DELAY_MS);
      return () => clearTimeout(t);
    } catch {
      /* noop */
    }
    return;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayColumnsLength, filteredRowCount, isDataReady, refreshCells]);

  // Invalidate cells when column formats change
  React.useEffect(() => {
    if (
      isInitializing ||
      !isDataReady ||
      !dataEditorRef.current ||
      !columnFormats
    ) {
      return;
    }

    const cellsToRefresh: { cell: [number, number] }[] = [];
    const prev = prevFormatsRef.current;

    // We cannot iterate displayColumns without it here; caller should update geometryKey to force a full redraw if needed.
    // Here we only detect format map differences, which will trigger a blanket refresh of all visible cells.
    const changed = Object.keys(columnFormats).some(
      (k) => columnFormats[k] !== prev[k]
    );

    if (changed) {
      for (let c = 0; c < displayColumnsLength; c += 1) {
        for (let r = 0; r < filteredRowCount; r += 1) {
          cellsToRefresh.push({ cell: [c, r] });
        }
      }
      refreshCells(cellsToRefresh);
      prevFormatsRef.current = { ...columnFormats };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    columnFormats,
    isInitializing,
    isDataReady,
    displayColumnsLength,
    filteredRowCount,
    refreshCells,
    dataEditorRef.current,
  ]);
}
