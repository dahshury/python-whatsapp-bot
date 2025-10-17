import type { DataEditorRef } from "@glideapps/glide-data-grid";
import { useEffect, useRef } from "react";

type FormatChangeRefreshArgs = {
	columnFormats: Record<string, string | undefined> | unknown;
	isInitializing: boolean;
	isDataReady: boolean;
	dataEditorRef: React.RefObject<DataEditorRef | null>;
	displayColumns: unknown[];
	filteredRowCount: number;
	refreshCells: (cells: { cell: [number, number] }[]) => void;
};

function getColumnId(col: unknown, idx: number): string {
	return (col as { id?: string }).id ?? `col_${idx}`;
}

type CellCollectionContext = {
	columnIdx: number;
	currentFormat: string | undefined;
	previousFormat: string | undefined;
	filteredRowCount: number;
};

function collectCellsForColumn(
	cellsToRefresh: { cell: [number, number] }[],
	context: CellCollectionContext
): void {
	if (context.currentFormat !== context.previousFormat) {
		for (let row = 0; row < context.filteredRowCount; row++) {
			cellsToRefresh.push({ cell: [context.columnIdx, row] });
		}
	}
}

function collectCellsToRefresh(
	displayColumns: unknown[],
	columnFormats: Record<string, string | undefined>,
	prevFormats: Record<string, string>,
	filteredRowCount: number
): { cell: [number, number] }[] {
	const cellsToRefresh: { cell: [number, number] }[] = [];

	for (let idx = 0; idx < displayColumns.length; idx++) {
		const columnId = getColumnId(displayColumns[idx], idx);
		const currentFormat = columnFormats[columnId];
		const previousFormat = prevFormats[columnId];

		collectCellsForColumn(cellsToRefresh, {
			columnIdx: idx,
			currentFormat,
			previousFormat,
			filteredRowCount,
		});
	}

	return cellsToRefresh;
}

export function useFormatChangeRefresh({
	columnFormats,
	isInitializing,
	isDataReady,
	dataEditorRef,
	displayColumns,
	filteredRowCount,
	refreshCells,
}: FormatChangeRefreshArgs): void {
	const prevFormatsRef = useRef<Record<string, string>>({});

	useEffect(() => {
		if (!isInitializing && isDataReady && dataEditorRef.current) {
			const formatsMap = columnFormats as Record<string, string | undefined>;
			const cellsToRefresh = collectCellsToRefresh(
				displayColumns,
				formatsMap,
				prevFormatsRef.current,
				filteredRowCount
			);

			if (cellsToRefresh.length > 0) {
				refreshCells(cellsToRefresh);
			}

			prevFormatsRef.current = { ...(columnFormats as Record<string, string>) };
		}
	}, [
		columnFormats,
		isInitializing,
		isDataReady,
		displayColumns,
		filteredRowCount,
		refreshCells,
		dataEditorRef.current,
	]);
}
