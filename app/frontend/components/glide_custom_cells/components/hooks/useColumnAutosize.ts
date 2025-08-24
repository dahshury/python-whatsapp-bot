import { useCallback, useRef } from "react";
import type { BaseColumnProps } from "../core/types";

export interface ColumnAutosizeOptions {
	minWidth?: number;
	maxWidth?: number;
	padding?: number;
	headerPadding?: number;
	sampleSize?: number;
}

export function useColumnAutosize(options: ColumnAutosizeOptions = {}) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const contextRef = useRef<CanvasRenderingContext2D | null>(null);

	const {
		minWidth = 50,
		maxWidth = 400,
		padding = 16,
		headerPadding = 20,
		sampleSize = 100,
	} = options;

	const getTextWidth = useCallback(
		(text: string, font: string = "14px Arial"): number => {
			if (!canvasRef.current) {
				canvasRef.current = document.createElement("canvas");
				contextRef.current = canvasRef.current.getContext("2d");
			}

			if (!contextRef.current) {
				return text.length * 8;
			}

			contextRef.current.font = font;
			return contextRef.current.measureText(text).width;
		},
		[],
	);

	const calculateColumnWidth = useCallback(
		(
			column: BaseColumnProps,
			data: any[],
			headerFont: string = "14px Arial",
			cellFont: string = "14px Arial",
		): number => {
			// Calculate header width
			const headerWidth = getTextWidth(column.name, headerFont) + headerPadding;

			// Get sample data for the column
			const sampleData = data.slice(0, sampleSize);
			const columnData = sampleData.map((row) => row[column.id]);

			// Calculate max content width
			let maxContentWidth = 0;
			for (const cellValue of columnData) {
				if (cellValue != null) {
					const cellText = String(cellValue);
					const cellWidth = getTextWidth(cellText, cellFont);
					maxContentWidth = Math.max(maxContentWidth, cellWidth);
				}
			}

			const contentWidth = maxContentWidth + padding;
			const finalWidth = Math.max(headerWidth, contentWidth);

			return Math.min(Math.max(finalWidth, minWidth), maxWidth);
		},
		[getTextWidth, headerPadding, padding, sampleSize, minWidth, maxWidth],
	);

	const autosizeColumn = useCallback(
		(
			column: BaseColumnProps,
			data: any[],
			onWidthChange: (columnId: string, width: number) => void,
		) => {
			const newWidth = calculateColumnWidth(column, data);
			onWidthChange(column.id, newWidth);
		},
		[calculateColumnWidth],
	);

	const autosizeColumns = useCallback(
		(
			columns: BaseColumnProps[],
			data: any[],
			onWidthChange: (columnId: string, width: number) => void,
		) => {
			columns.forEach((column) => {
				autosizeColumn(column, data, onWidthChange);
			});
		},
		[autosizeColumn],
	);

	const autosizeVisibleColumns = useCallback(
		(
			columns: BaseColumnProps[],
			data: any[],
			hiddenColumns: Set<string>,
			onWidthChange: (columnId: string, width: number) => void,
		) => {
			const visibleColumns = columns.filter(
				(col) => !hiddenColumns.has(col.id),
			);
			autosizeColumns(visibleColumns, data, onWidthChange);
		},
		[autosizeColumns],
	);

	const getOptimalWidth = useCallback(
		(column: BaseColumnProps, data: any[]): number => {
			return calculateColumnWidth(column, data);
		},
		[calculateColumnWidth],
	);

	const getOptimalWidths = useCallback(
		(columns: BaseColumnProps[], data: any[]): Record<string, number> => {
			const widths: Record<string, number> = {};
			columns.forEach((column) => {
				widths[column.id] = calculateColumnWidth(column, data);
			});
			return widths;
		},
		[calculateColumnWidth],
	);

	return {
		autosizeColumn,
		autosizeColumns,
		autosizeVisibleColumns,
		getOptimalWidth,
		getOptimalWidths,
		calculateColumnWidth,
	};
}
