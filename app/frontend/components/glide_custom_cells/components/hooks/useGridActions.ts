import {
	GridCellKind,
	type GridColumn,
	type GridSelection,
} from "@glideapps/glide-data-grid";
import React from "react";

// Extended cell type that includes copyData for custom cells
type ExtendedGridCell = {
	kind: GridCellKind;
	displayData?: any;
	data?: any;
	copyData?: any; // Available on custom cells
};

export function useGridActions(
	columns: GridColumn[],
	setHiddenColumns: React.Dispatch<React.SetStateAction<Set<number>>>,
	selection: GridSelection,
	setDeletedRows: React.Dispatch<React.SetStateAction<Set<number>>>,
	visibleRows: number[],
	numRows: number,
	getCellContent: (
		col: number,
		row: number,
	) => {
		kind: GridCellKind;
		displayData?: any;
		data?: any;
	},
	deletedRows: Set<number>,
	columnsState: GridColumn[],
	setColumns: React.Dispatch<React.SetStateAction<GridColumn[]>>,
	hiddenColumns: Set<number>,
) {
	// Only consider row selections for hasSelection (used for delete button)
	const hasSelection = selection.rows.toArray().length > 0;

	// Track if download is in progress to prevent duplicate calls
	const downloadInProgressRef = React.useRef(false);

	const handleDeleteRows = React.useCallback(() => {
		const rowsToDelete = new Set<number>();
		// selection.rows is a CompactSelection, we need to iterate it
		selection.rows.toArray().forEach((r) => {
			const actualRow = visibleRows[r];
			if (actualRow !== undefined) {
				rowsToDelete.add(actualRow);
			}
		});

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
			// Enhanced CSV export with UTF-8 BOM, proper escaping and deletion filtering
			const CSV_DELIMITER = ",";
			const CSV_ROW_DELIMITER = "\n";
			const UTF8_BOM = "\ufeff"; // Ensures Excel opens the file with correct encoding

			const escapeValue = (value: unknown): string => {
				if (value === null || value === undefined) return "";
				const str = String(value);
				// Escape if contains delimiter, quote or newline
				if (/[",\n]/.test(str)) {
					return `"${str.replace(/"/g, '""')}"`;
				}
				return str;
			};

			const rows: string[] = [];
			// Header row
			rows.push(
				columns.map((c) => escapeValue(c.title ?? "")).join(CSV_DELIMITER),
			);

			for (let r = 0; r < numRows; r++) {
				if (deletedRows.has(r)) continue; // Skip deleted rows
				const rowVals: string[] = [];
				for (let c = 0; c < columns.length; c++) {
					const cell = getCellContent(c, r);
					// We treat displayData > data > empty string for text-like cells, else raw data
					switch (cell.kind) {
						case GridCellKind.Text:
						case GridCellKind.Uri as any:
							rowVals.push(escapeValue(cell.displayData ?? cell.data ?? ""));
							break;
						case GridCellKind.Number:
							rowVals.push(escapeValue((cell as any).data ?? ""));
							break;
						case GridCellKind.Custom:
							// Most of our custom cells include a copyData field for plain export.
							// Fallback to their displayData/data if copyData absent.
							const extendedCell = cell as ExtendedGridCell;
							rowVals.push(
								escapeValue(
									extendedCell.copyData ?? extendedCell.displayData ?? extendedCell.data ?? "",
								),
							);
							break;
						default:
							rowVals.push(escapeValue(""));
					}
				}
				rows.push(rowVals.join(CSV_DELIMITER));
			}

			const csvContent = UTF8_BOM + rows.join(CSV_ROW_DELIMITER);
			const timestamp = new Date().toISOString().slice(0, 16).replace(":", "-");
			const suggestedName = `${timestamp}_export.csv`;

			// Try native file save picker first (where supported) - following Streamlit pattern
			try {
				// @ts-ignore – showSaveFilePicker is still experimental in TS lib
				if (window.showSaveFilePicker) {
					// @ts-ignore
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
		} catch (error) {
			console.error("Failed to export CSV:", error);
		} finally {
			// Reset the flag after a short delay to prevent rapid successive calls
			setTimeout(() => {
				downloadInProgressRef.current = false;
			}, 1000);
		}
	}, [columns, numRows, getCellContent, deletedRows]);

	const handleToggleColumnVisibility = React.useCallback(() => {
		// use first selected column (if any) else do nothing
		const colIndex = selection.columns.first() ?? 0;
		setHiddenColumns((prev) => {
			const next = new Set(prev);
			if (next.has(colIndex)) next.delete(colIndex);
			else next.add(colIndex);
			return next;
		});
	}, [selection.columns, setHiddenColumns]);

	const handleAutosizeColumns = React.useCallback(() => {
		const newCols = columnsState.map((col, idx) => {
			if (hiddenColumns.has(idx)) return col;
			let maxLen = col.title.length;
			for (const r of visibleRows) {
				const val = getCellContent(idx, r);
				const text =
					val.kind === GridCellKind.Text ||
					(val.kind as any) === GridCellKind.Uri
						? (val.displayData ?? val.data ?? "")
						: String((val as any).data ?? "");
				maxLen = Math.max(maxLen, text.length);
			}
			return { ...col, width: Math.min(300, Math.max(80, maxLen * 8)) };
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
