import { useCallback, useMemo, useState } from "react";
import type { GridSelection } from "../core/types";
import { useDebouncedCallback } from "./use-debounced-callback";

// Selection debounce delay in milliseconds
const SELECTION_CHANGE_DEBOUNCE_MS = 150;

export type SelectionState = {
	selectedRows: Set<number>;
	selectedColumns: Set<string>;
	anchorRow?: number;
	anchorColumn?: string;
	isMultiSelectMode: boolean;
};

export function useAdvancedSelection(
	_onGridSelectionChange?: (selection: GridSelection) => void
) {
	const [selectionState, setSelectionState] = useState<SelectionState>({
		selectedRows: new Set(),
		selectedColumns: new Set(),
		isMultiSelectMode: false,
	});

	const { debouncedCallback: debouncedSelectionChange } = useDebouncedCallback(
		// Placeholder for future selection change handling
		(_selection: GridSelection) => {
			// Selection change handling is not yet implemented
		},
		SELECTION_CHANGE_DEBOUNCE_MS
	);

	const selectRow = useCallback((rowIndex: number, multiSelect = false) => {
		setSelectionState((prev) => {
			if (!multiSelect) {
				const newSelection = new Set([rowIndex]);
				return {
					...prev,
					selectedRows: newSelection,
					anchorRow: rowIndex,
					isMultiSelectMode: false,
				};
			}

			const newSelectedRows = new Set(prev.selectedRows);
			if (newSelectedRows.has(rowIndex)) {
				newSelectedRows.delete(rowIndex);
			} else {
				newSelectedRows.add(rowIndex);
			}

			return {
				...prev,
				selectedRows: newSelectedRows,
				anchorRow: prev.anchorRow ?? rowIndex,
				isMultiSelectMode: true,
			};
		});
	}, []);

	const selectRowRange = useCallback((startRow: number, endRow: number) => {
		setSelectionState((prev) => {
			const start = Math.min(startRow, endRow);
			const end = Math.max(startRow, endRow);
			const newSelectedRows = new Set(prev.selectedRows);

			for (let i = start; i <= end; i++) {
				newSelectedRows.add(i);
			}

			return {
				...prev,
				selectedRows: newSelectedRows,
				anchorRow: startRow,
				isMultiSelectMode: true,
			};
		});
	}, []);

	const selectColumn = useCallback((columnId: string, multiSelect = false) => {
		setSelectionState((prev) => {
			if (!multiSelect) {
				const newSelection = new Set([columnId]);
				return {
					...prev,
					selectedColumns: newSelection,
					anchorColumn: columnId,
					isMultiSelectMode: false,
				};
			}

			const newSelectedColumns = new Set(prev.selectedColumns);
			if (newSelectedColumns.has(columnId)) {
				newSelectedColumns.delete(columnId);
			} else {
				newSelectedColumns.add(columnId);
			}

			return {
				...prev,
				selectedColumns: newSelectedColumns,
				anchorColumn: prev.anchorColumn ?? columnId,
				isMultiSelectMode: true,
			};
		});
	}, []);

	const clearSelection = useCallback(() => {
		setSelectionState({
			selectedRows: new Set(),
			selectedColumns: new Set(),
			isMultiSelectMode: false,
		});
	}, []);

	const selectAll = useCallback((totalRows: number, columnIds: string[]) => {
		setSelectionState({
			selectedRows: new Set(Array.from({ length: totalRows }, (_, i) => i)),
			selectedColumns: new Set(columnIds),
			isMultiSelectMode: true,
		});
	}, []);

	const invertSelection = useCallback(
		(totalRows: number, columnIds: string[]) => {
			setSelectionState((prev) => {
				const allRows = new Set(Array.from({ length: totalRows }, (_, i) => i));
				const allColumns = new Set(columnIds);

				const newSelectedRows = new Set<number>();
				for (const row of allRows) {
					if (!prev.selectedRows.has(row)) {
						newSelectedRows.add(row);
					}
				}

				const newSelectedColumns = new Set<string>();
				for (const col of allColumns) {
					if (!prev.selectedColumns.has(col)) {
						newSelectedColumns.add(col);
					}
				}

				return {
					...prev,
					selectedRows: newSelectedRows,
					selectedColumns: newSelectedColumns,
					isMultiSelectMode: true,
				};
			});
		},
		[]
	);

	const isRowSelected = useCallback(
		(rowIndex: number): boolean => selectionState.selectedRows.has(rowIndex),
		[selectionState.selectedRows]
	);

	const isColumnSelected = useCallback(
		(columnId: string): boolean => selectionState.selectedColumns.has(columnId),
		[selectionState.selectedColumns]
	);

	const getSelectedRowsArray = useCallback(
		(): number[] =>
			Array.from(selectionState.selectedRows).sort((a, b) => a - b),
		[selectionState.selectedRows]
	);

	const getSelectedColumnsArray = useCallback(
		(): string[] => Array.from(selectionState.selectedColumns),
		[selectionState.selectedColumns]
	);

	const handleKeyboardSelection = useCallback(
		(options: {
			event: KeyboardEvent;
			currentRow: number;
			currentColumn: string;
			totalRows: number;
			columnIds: string[];
		}) => {
			const { event, currentRow, totalRows, columnIds } = options;
			if ((event.ctrlKey || event.metaKey) && event.key === "a") {
				event.preventDefault();
				selectAll(totalRows, columnIds);
				return;
			}

			if (
				event.shiftKey &&
				selectionState.anchorRow !== undefined &&
				(event.key === "ArrowUp" || event.key === "ArrowDown")
			) {
				event.preventDefault();
				const newRow =
					event.key === "ArrowUp"
						? Math.max(0, currentRow - 1)
						: Math.min(totalRows - 1, currentRow + 1);
				selectRowRange(selectionState.anchorRow, newRow);
				return;
			}

			if (event.key === "Escape") {
				clearSelection();
			}
		},
		[selectionState.anchorRow, selectAll, selectRowRange, clearSelection]
	);

	const gridSelection = useMemo(
		(): GridSelection => ({
			rows: getSelectedRowsArray(),
			columns: getSelectedColumnsArray(),
		}),
		[getSelectedRowsArray, getSelectedColumnsArray]
	);

	// Trigger debounced callback when selection changes
	useMemo(() => {
		debouncedSelectionChange(gridSelection);
	}, [gridSelection, debouncedSelectionChange]);

	return {
		selectionState,
		selectRow,
		selectRowRange,
		selectColumn,
		clearSelection,
		selectAll,
		invertSelection,
		isRowSelected,
		isColumnSelected,
		getSelectedRowsArray,
		getSelectedColumnsArray,
		handleKeyboardSelection,
		gridSelection,
		hasSelection:
			selectionState.selectedRows.size > 0 ||
			selectionState.selectedColumns.size > 0,
		selectedRowCount: selectionState.selectedRows.size,
		selectedColumnCount: selectionState.selectedColumns.size,
	};
}
