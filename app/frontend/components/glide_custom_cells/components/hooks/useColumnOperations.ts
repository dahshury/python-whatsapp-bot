import type { GridCell, GridColumn } from "@glideapps/glide-data-grid";
import React from "react";
import { extractCellDisplayText } from "../utils/cellTextExtraction";

// Column configuration interface (same as in GridDataEditor and Grid)
// interface ColumnConfig {
// 	pinned?: boolean;
// 	width?: number;
// 	hidden?: boolean;
// }

interface UseColumnOperationsProps {
	columns: GridColumn[];
	displayColumns: GridColumn[];
	visibleColumnIndices: number[];
	filteredRows: number[];
	getRawCellContent: (col: number, row: number) => unknown;
	getCellContent: (cell: [number, number]) => unknown;
	setColumns: (
		columns: GridColumn[] | ((prev: GridColumn[]) => GridColumn[]),
	) => void;
	columnConfigMapping: Map<string, unknown>;
	setColumnConfigMapping: (mapping: Map<string, unknown>) => void;
	clearSelection: (keepRows?: boolean, keepColumns?: boolean) => void;
	dataEditorRef: React.RefObject<unknown>;
}

export const useColumnOperations = ({
	columns: _columns,
	displayColumns,
	visibleColumnIndices,
	filteredRows,
	getRawCellContent: _getRawCellContent,
	getCellContent,
	setColumns,
	columnConfigMapping,
	setColumnConfigMapping,
	clearSelection,
	dataEditorRef,
}: UseColumnOperationsProps) => {
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
			if (displayColIndex < 0 || !displayColumns[displayColIndex]) return;

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
				const cell = getCellContent([displayColIndex, i]);
				const text = extractCellDisplayText(cell as GridCell);

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
			const displayColIndex = displayColumns.findIndex(
				(c) => c.id === columnId,
			);
			if (displayColIndex < 0) return;

			const configKey = columnId ?? `col_${displayColIndex}`;
			const newMapping = new Map(columnConfigMapping);
			const existingConfig =
				(newMapping.get(configKey) as Record<string, unknown>) || {};
			newMapping.set(configKey, {
				...existingConfig,
				pinned: true,
			});
			// Clean up legacy index-based key if different
			const legacyKey = `col_${displayColIndex}`;
			if (legacyKey !== configKey && newMapping.has(legacyKey)) {
				newMapping.delete(legacyKey);
			}
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
			const displayColIndex = displayColumns.findIndex(
				(c) => c.id === columnId,
			);
			if (displayColIndex < 0) return;

			const configKey = columnId ?? `col_${displayColIndex}`;
			const newMapping = new Map(columnConfigMapping);
			const existingConfig =
				(newMapping.get(configKey) as Record<string, unknown>) || {};
			newMapping.set(configKey, {
				...existingConfig,
				pinned: false,
			});
			const legacyKey = `col_${displayColIndex}`;
			if (legacyKey !== configKey && newMapping.has(legacyKey)) {
				newMapping.delete(legacyKey);
			}
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
