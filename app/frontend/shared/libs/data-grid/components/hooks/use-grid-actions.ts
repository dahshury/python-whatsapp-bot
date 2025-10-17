import {
	GridCellKind,
	type GridColumn,
	type GridSelection,
} from "@glideapps/glide-data-grid";
import React from "react";

// CSV formatting constants
const CSV_DELIMITER_REGEX = /[",\n]/;
const CSV_QUOTE_REGEX = /"/g;

// CSV export constants
const UTF8_BOM = "\uFEFF";
const CSV_DELIMITER = ",";
const CSV_ROW_DELIMITER = "\n";
const DOWNLOAD_RESET_DELAY_MS = 1000;
const ISO_DATE_SLICE_LENGTH = 16;

// Column auto-sizing constants
const MAX_COLUMN_WIDTH = 300;
const MIN_COLUMN_WIDTH = 80;
const CHAR_WIDTH_MULTIPLIER = 8;

// Extended cell type that includes copyData for custom cells
type ExtendedGridCell = {
	kind: GridCellKind;
	displayData?: unknown;
	data?: unknown;
	copyData?: unknown; // Available on custom cells
};

// Helper to escape CSV values
const escapeValue = (value: unknown): string => {
	if (value === null || value === undefined) {
		return "";
	}
	const str = String(value);
	// Escape if contains delimiter, quote or newline
	if (CSV_DELIMITER_REGEX.test(str)) {
		return `"${str.replace(CSV_QUOTE_REGEX, '""')}"`;
	}
	return str;
};

// Helper to extract cell value for CSV export
const getCellValueForExport = (cell: ExtendedGridCell): unknown => {
	switch (cell.kind) {
		case GridCellKind.Text:
		case (GridCellKind as { Uri?: string }).Uri:
			return cell.displayData ?? cell.data ?? "";
		case GridCellKind.Number:
			return (cell as { data?: unknown }).data ?? "";
		case GridCellKind.Custom:
			// Most custom cells include copyData for export
			return cell.copyData ?? cell.displayData ?? cell.data ?? "";
		default:
			return "";
	}
};

// Helper to build CSV row values
const buildCsvRow = (
	columns: GridColumn[],
	cellRow: number,
	getCellContent: (col: number, row: number) => ExtendedGridCell
): string[] => {
	const rowVals: string[] = [];
	for (let c = 0; c < columns.length; c++) {
		const cell = getCellContent(c, cellRow);
		const value = getCellValueForExport(cell);
		rowVals.push(escapeValue(value));
	}
	return rowVals;
};

// Helper to generate CSV content
const generateCsvContent = (
	columns: GridColumn[],
	numRows: number,
	deletedRows: Set<number>,
	getCellContent: (col: number, row: number) => ExtendedGridCell
): string => {
	const rows: string[] = [];
	// Header row
	rows.push(columns.map((c) => escapeValue(c.title ?? "")).join(CSV_DELIMITER));

	// Data rows
	for (let r = 0; r < numRows; r++) {
		if (deletedRows.has(r)) {
			continue; // Skip deleted rows
		}
		const rowVals = buildCsvRow(columns, r, getCellContent);
		rows.push(rowVals.join(CSV_DELIMITER));
	}

	return UTF8_BOM + rows.join(CSV_ROW_DELIMITER);
};

export function useGridActions(options: {
	columns: GridColumn[];
	setHiddenColumns: React.Dispatch<React.SetStateAction<Set<number>>>;
	selection: GridSelection;
	setDeletedRows: React.Dispatch<React.SetStateAction<Set<number>>>;
	visibleRows: number[];
	numRows: number;
	getCellContent: (
		col: number,
		row: number
	) => {
		kind: GridCellKind;
		displayData?: unknown;
		data?: unknown;
	};
	deletedRows: Set<number>;
	columnsState: GridColumn[];
	setColumns: React.Dispatch<React.SetStateAction<GridColumn[]>>;
	hiddenColumns: Set<number>;
}) {
	const {
		columns,
		setHiddenColumns,
		selection,
		setDeletedRows,
		visibleRows,
		numRows,
		getCellContent,
		deletedRows,
		columnsState,
		setColumns,
		hiddenColumns,
	} = options;

	// Only consider row selections for hasSelection (used for delete button)
	const hasSelection = selection.rows.toArray().length > 0;

	// Track if download is in progress to prevent duplicate calls
	const downloadInProgressRef = React.useRef(false);

	const handleDeleteRows = React.useCallback(() => {
		const rowsToDelete = new Set<number>();
		// selection.rows is a CompactSelection, we need to iterate it
		for (const r of selection.rows.toArray()) {
			const actualRow = visibleRows[r];
			if (actualRow !== undefined) {
				rowsToDelete.add(actualRow);
			}
		}

		if (rowsToDelete.size > 0) {
			setDeletedRows((current) => new Set([...current, ...rowsToDelete]));
			// Clear row selection after deletion
			// This needs to be handled in the component
			// setSelection(s => ({ ...s, rows: CompactSelection.empty() }));
		}
	}, [selection.rows, visibleRows, setDeletedRows]);

	const handleDownloadCsv = React.useCallback(async () => {
		// Prevent duplicate calls
		if (downloadInProgressRef.current) {
			return;
		}

		downloadInProgressRef.current = true;

		try {
			const csvContent = generateCsvContent(
				columns,
				numRows,
				deletedRows,
				getCellContent as (col: number, row: number) => ExtendedGridCell
			);

			const timestamp = new Date()
				.toISOString()
				.slice(0, ISO_DATE_SLICE_LENGTH)
				.replace(":", "-");
			const suggestedName = `${timestamp}_export.csv`;

			// Try native file save picker first (where supported) - following Streamlit pattern
			try {
				// @ts-expect-error – showSaveFilePicker is still experimental in TS lib
				if (window.showSaveFilePicker) {
					// @ts-expect-error
					const handle = await window.showSaveFilePicker({
						suggestedName,
						types: [
							{ description: "CSV file", accept: { "text/csv": [".csv"] } },
						],
					});
					const writable = await handle.createWritable();
					await writable.write(csvContent);
					await writable.close();
					return; // Success, exit early
				}
			} catch (err) {
				// User cancelled or error, fall through to fallback
				if (err instanceof Error && err.name === "AbortError") {
					return; // User cancelled, don't show fallback
				}
			}

			// Fallback: trigger invisible download link
			const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = suggestedName;
			link.style.display = "none";
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
		} catch (_error) {
			// Silently ignore download errors
		} finally {
			// Reset the flag after a short delay to prevent rapid successive calls
			setTimeout(() => {
				downloadInProgressRef.current = false;
			}, DOWNLOAD_RESET_DELAY_MS);
		}
	}, [columns, numRows, getCellContent, deletedRows]);

	const handleToggleColumnVisibility = React.useCallback(() => {
		// use first selected column (if any) else do nothing
		const colIndex = selection.columns.first() ?? 0;
		setHiddenColumns((prev) => {
			const next = new Set(prev);
			if (next.has(colIndex)) {
				next.delete(colIndex);
			} else {
				next.add(colIndex);
			}
			return next;
		});
	}, [selection.columns, setHiddenColumns]);

	const handleAutosizeColumns = React.useCallback(() => {
		const newCols = columnsState.map((col, idx) => {
			if (hiddenColumns.has(idx)) {
				return col;
			}
			let maxLen = col.title.length;
			for (const r of visibleRows) {
				const val = getCellContent(idx, r);
				const text =
					val.kind === GridCellKind.Text ||
					(val.kind as unknown) === (GridCellKind as { Uri?: string }).Uri
						? (val.displayData ?? val.data ?? "")
						: String((val as { data?: unknown }).data ?? "");
				const s = String(text);
				maxLen = Math.max(maxLen, s.length);
			}
			return {
				...col,
				width: Math.min(
					MAX_COLUMN_WIDTH,
					Math.max(MIN_COLUMN_WIDTH, maxLen * CHAR_WIDTH_MULTIPLIER)
				),
			};
		});
		setColumns(newCols);
	}, [columnsState, visibleRows, hiddenColumns, getCellContent, setColumns]);

	return {
		handleDeleteRows,
		handleDownloadCsv,
		handleToggleColumnVisibility,
		handleAutosizeColumns,
		hasSelection,
	};
}
