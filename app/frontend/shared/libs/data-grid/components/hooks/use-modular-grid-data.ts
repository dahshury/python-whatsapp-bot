import {
	type EditableGridCell,
	type GridCell,
	GridCellKind,
	type Item,
	type Theme,
} from "@glideapps/glide-data-grid";
import React from "react";
import { registerDefaultColumnTypes } from "../core/column-types";
import type { IDataSource } from "../core/interfaces/i-data-source";
import { DataProvider } from "../core/services/data-provider";

// Register column types once when module loads
registerDefaultColumnTypes();

type ModularGridDataOptions = {
	dataSource: IDataSource;
	visibleColumnIndices: number[];
	theme: Partial<Theme>;
	darkTheme: Partial<Theme>;
	columnFormats?: Record<string, string>;
};

export function useModularGridData(options: ModularGridDataOptions) {
	const { dataSource, visibleColumnIndices, theme, darkTheme, columnFormats } =
		options;
	// Track previous provider to migrate editing state when dataSource changes
	const previousProviderRef = React.useRef<DataProvider | null>(null);
	// Recreate data provider when theme or formats change to ensure cells use new settings
	const dataProvider = React.useMemo(() => {
		const provider = new DataProvider(dataSource, theme, theme === darkTheme);
		if (columnFormats) {
			provider.setColumnFormats(columnFormats);
		}
		return provider;
	}, [dataSource, columnFormats, darkTheme, theme]); // Only recreate if data source changes

	// Update theme and formats without recreating the provider
	React.useEffect(() => {
		dataProvider.updateTheme(theme, theme === darkTheme);
	}, [theme, darkTheme, dataProvider]);

	React.useEffect(() => {
		if (columnFormats) {
			dataProvider.setColumnFormats(columnFormats);
		}
	}, [columnFormats, dataProvider]);

	// Helper to migrate previous editing state to new provider
	const migrateEditingState = React.useCallback(
		(
			prev: DataProvider,
			nextProvider: DataProvider,
			baseRows: number,
			colCount: number
		) => {
			const prevEditing = prev.getEditingState();
			if (!prevEditing) {
				return;
			}

			const reapplyDeletions = () => {
				const deleted: number[] = prevEditing.getDeletedRows?.() || [];
				for (const rowIndex of deleted) {
					const isValidIndex =
						typeof rowIndex === "number" &&
						rowIndex >= 0 &&
						rowIndex < baseRows;
					if (!isValidIndex) {
						continue;
					}
					// Best-effort; ignore failures
					nextProvider.deleteRow?.(rowIndex);
				}
			};

			const applyRowEdits = (rowIndex: number) => {
				const wasAdded = prevEditing.isAddedRow?.(rowIndex) === true;
				if (wasAdded) {
					return;
				}
				for (let c = 0; c < colCount; c++) {
					const cell = prevEditing.getCell?.(c, rowIndex);
					if (cell === undefined) {
						continue;
					}
					// Best-effort; ignore failures
					nextProvider.setCell(c, rowIndex, cell);
				}
			};

			const reapplyOverlappingEdits = () => {
				const prevBaseRows = prev.getRowCount();
				const limit = Math.min(baseRows, prevBaseRows);
				for (let r = 0; r < limit; r++) {
					applyRowEdits(r);
				}
			};

			const copyCellsToRow = (sourceRow: number, targetRow: number) => {
				for (let c = 0; c < colCount; c++) {
					const cell = prevEditing.getCell?.(c, sourceRow);
					if (cell === undefined) {
						continue;
					}
					// Best-effort; ignore failures
					nextProvider.setCell(c, targetRow, cell);
				}
			};

			const recreateAddedRows = () => {
				const prevTotal: number = prevEditing.getNumRows?.() ?? baseRows;
				const prevBaseRows = prev.getRowCount();
				for (let r = prevBaseRows; r < prevTotal; r++) {
					const isAdded = prevEditing.isAddedRow?.(r) === true;
					if (!isAdded) {
						continue;
					}
					const handleNewRow = (newIndex: unknown) => {
						const newRowIndex =
							typeof newIndex === "number"
								? (newIndex as number)
								: nextProvider.getRowCount() - 1;
						copyCellsToRow(r, newRowIndex);
					};
					Promise.resolve(nextProvider.addRow()).then(handleNewRow);
				}
			};

			reapplyDeletions();
			reapplyOverlappingEdits();
			recreateAddedRows();
		},
		[]
	);

	// Best-effort migration of editing state from previous provider to the new one
	// This preserves added rows and edited cells across websocket-driven data updates
	React.useEffect(() => {
		const prev = previousProviderRef.current;
		if (!prev || prev === dataProvider) {
			previousProviderRef.current = dataProvider;
			return;
		}

		try {
			const nextProvider = dataProvider;
			const baseRows: number = nextProvider.getRowCount();
			const colCount: number = nextProvider.getColumnCount();

			migrateEditingState(prev, nextProvider, baseRows, colCount);
		} catch {
			// Silently ignore migration errors
		}

		previousProviderRef.current = dataProvider;
	}, [dataProvider, migrateEditingState]);

	const getRawCellContent = React.useCallback(
		(col: number, row: number): GridCell => dataProvider.getCell(col, row),
		[dataProvider]
	);

	const getCellContent = React.useCallback(
		(visibleRows: readonly number[]) =>
			(cell: Item): GridCell => {
				const [displayCol, displayRow] = cell;
				const actualCol = visibleColumnIndices[displayCol];
				const actualRow = visibleRows[displayRow];

				if (actualRow === undefined || actualCol === undefined) {
					return {
						kind: GridCellKind.Text,
						data: "",
						displayData: "",
						allowOverlay: false,
					};
				}

				return dataProvider.getCell(actualCol, actualRow);
			},
		[visibleColumnIndices, dataProvider]
	);

	const onCellEdited = React.useCallback(
		(visibleRows: readonly number[]) =>
			(cell: Item, newValue: EditableGridCell) => {
				const [displayCol, displayRow] = cell;
				const actualCol = visibleColumnIndices[displayCol];
				const actualRow = visibleRows[displayRow];

				if (actualRow !== undefined && actualCol !== undefined) {
					dataProvider.setCell(actualCol, actualRow, newValue as GridCell);
				}
			},
		[visibleColumnIndices, dataProvider]
	);

	return {
		getCellContent,
		onCellEdited,
		getRawCellContent,
		dataProvider,
	};
}
