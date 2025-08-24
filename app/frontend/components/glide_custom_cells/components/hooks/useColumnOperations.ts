import type { GridColumn } from "@glideapps/glide-data-grid";
import React from "react";
import { ColumnService } from "../services/ColumnService";
import { extractCellDisplayText } from "../utils/cellTextExtraction";

// Column configuration interface (same as in GridDataEditor and Grid)
interface ColumnConfig {
	pinned?: boolean;
	width?: number;
	hidden?: boolean;
}

interface UseColumnOperationsProps {
	columns: GridColumn[];
	displayColumns: GridColumn[];
	visibleColumnIndices: number[];
	filteredRows: number[];
	getRawCellContent: (col: number, row: number) => any;
	getCellContent: (cell: [number, number]) => any;
	setColumns: (
		columns: GridColumn[] | ((prev: GridColumn[]) => GridColumn[]),
	) => void;
	columnConfigMapping: Map<string, any>;
	setColumnConfigMapping: (mapping: Map<string, any>) => void;
	clearSelection: (keepRows?: boolean, keepColumns?: boolean) => void;
	dataEditorRef: React.RefObject<any>;
}

export const useColumnOperations = ({
	columns,
	displayColumns,
	visibleColumnIndices,
	filteredRows,
	getRawCellContent,
	getCellContent,
	setColumns,
	columnConfigMapping,
	setColumnConfigMapping,
	clearSelection,
	dataEditorRef,
}: UseColumnOperationsProps) => {
	const _columnService = React.useMemo(() => new ColumnService(), []);

	const handleAutosize = React.useCallback(
		(columnId: string) => {
			if (!dataEditorRef?.current) {
				console.warn("DataEditor ref not available for autosize");
				return;
			}

			// Find the column index in displayColumns
			const displayColIndex = displayColumns.findIndex(
				(c) => c.id === columnId,
			);
			if (displayColIndex < 0) return;

			// Find the actual column index in the original columns array
			const actualColIndex = visibleColumnIndices[displayColIndex];
			if (actualColIndex === undefined) return;

			const MIN_COLUMN_WIDTH = 50;
			const MAX_COLUMN_WIDTH = 500;
			const HEADER_PADDING = 16;
			const CELL_PADDING = 16;
			const MAX_SAMPLE_SIZE = 100;

			// Create a canvas for text measurement
			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d");
			if (!ctx) return;

			const measureTextWidth = (text: string, font: string) => {
				ctx.font = font;
				return Math.ceil(ctx.measureText(text).width);
			};

			// Measure header width with bold font
			const headerTitle = displayColumns[displayColIndex].title;
			const headerWidth =
				measureTextWidth(
					headerTitle,
					"600 13px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
				) + HEADER_PADDING;

			// Measure cell content widths using the formatted cell content
			let maxCellWidth = 0;
			const sampleSize = Math.min(filteredRows.length, MAX_SAMPLE_SIZE);

			for (let i = 0; i < sampleSize; i++) {
				// The display row index is just the index in the filtered list (i)
				// because getCellContent internally maps displayRow -> original data row
				const cell = getCellContent([displayColIndex, i]);
				// Use the proper utility to extract display text from any cell type
				const text = extractCellDisplayText(cell);

				if (text) {
					const cellWidth = measureTextWidth(
						text,
						"13px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
					);
					maxCellWidth = Math.max(maxCellWidth, cellWidth);
				}
			}

			const contentWidth = maxCellWidth + CELL_PADDING;
			const finalWidth = Math.max(headerWidth, contentWidth);

			const calculatedWidth = Math.max(
				MIN_COLUMN_WIDTH,
				Math.min(finalWidth, MAX_COLUMN_WIDTH),
			);

			// Set the calculated width
			setColumns((prev) =>
				Array.isArray(prev)
					? prev.map((c, idx) =>
							idx === actualColIndex
								? { ...c, width: calculatedWidth, grow: 0 }
								: c,
						)
					: prev,
			);
		},
		[
			displayColumns,
			visibleColumnIndices,
			filteredRows,
			getCellContent,
			setColumns,
			dataEditorRef?.current,
		],
	);

	const handlePin = React.useCallback(
		(columnId: string, _side: "left" | "right") => {
			// Find the column index in displayColumns to create the proper mapping ID
			const displayColIndex = displayColumns.findIndex(
				(c) => c.id === columnId,
			);
			if (displayColIndex < 0) return;

			const configId = `col_${displayColIndex}`;
			const newMapping = new Map(columnConfigMapping);
			newMapping.set(configId, {
				...newMapping.get(configId),
				pinned: true,
			});
			setColumnConfigMapping(newMapping);
			clearSelection(true, false);
		},
		[
			displayColumns,
			columnConfigMapping,
			setColumnConfigMapping,
			clearSelection,
		],
	);

	const handleUnpin = React.useCallback(
		(columnId: string) => {
			// Find the column index in displayColumns to create the proper mapping ID
			const displayColIndex = displayColumns.findIndex(
				(c) => c.id === columnId,
			);
			if (displayColIndex < 0) return;

			const configId = `col_${displayColIndex}`;
			const newMapping = new Map(columnConfigMapping);
			newMapping.set(configId, {
				...newMapping.get(configId),
				pinned: false,
			});
			setColumnConfigMapping(newMapping);
			clearSelection(true, false);
		},
		[
			displayColumns,
			columnConfigMapping,
			setColumnConfigMapping,
			clearSelection,
		],
	);

	return {
		handleAutosize,
		handlePin,
		handleUnpin,
	};
};
