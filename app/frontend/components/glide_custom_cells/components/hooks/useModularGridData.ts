import {
	type EditableGridCell,
	type GridCell,
	GridCellKind,
	type Item,
	type Theme,
} from "@glideapps/glide-data-grid";
import React from "react";
import { registerDefaultColumnTypes } from "../core/column-types";
import type { IDataSource } from "../core/interfaces/IDataSource";
import { DataProvider } from "../core/services/DataProvider";

// Register column types once when module loads
registerDefaultColumnTypes();

export function useModularGridData(
	dataSource: IDataSource,
	visibleColumnIndices: number[],
	theme: Partial<Theme>,
	darkTheme: Partial<Theme>,
	columnFormats?: Record<string, string>,
) {
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

	// Best-effort migration of editing state from previous provider to the new one
	// This preserves added rows and edited cells across websocket-driven data updates
	React.useEffect(() => {
		const prev = previousProviderRef.current;
		if (!prev || prev === dataProvider) {
			previousProviderRef.current = dataProvider;
			return;
		}

		try {
			const prevEditing = prev.getEditingState();
			const nextProvider = dataProvider;
			const baseRows: number = nextProvider.getRowCount();
			const colCount: number = nextProvider.getColumnCount();

			if (prevEditing) {
				// 1) Reapply deletions on existing rows (only for base data rows)
				try {
					const deleted: number[] = prevEditing.getDeletedRows?.() || [];
					for (const r of deleted) {
						if (typeof r === "number" && r >= 0 && r < baseRows) {
							try {
								void nextProvider.deleteRow?.(r);
							} catch {}
						}
					}
				} catch {}

				// 2) Reapply edited cells for overlapping base rows/columns
				// Only migrate edits to existing data rows, not added rows
				try {
					const prevBaseRows = prev.getRowCount();
					const limit = Math.min(baseRows, prevBaseRows);
					for (let r = 0; r < limit; r++) {
						// Skip if this was an added row in the previous state
						const wasAdded = prevEditing.isAddedRow?.(r) === true;
						if (wasAdded) continue;

						for (let c = 0; c < colCount; c++) {
							const cell = prevEditing.getCell?.(c, r);
							if (cell !== undefined) {
								try {
									nextProvider.setCell(c, r, cell);
								} catch {}
							}
						}
					}
				} catch {}

				// 3) Recreate ALL added rows and copy their cells
				// Added rows are completely isolated from websocket updates
				try {
					const prevTotal: number = prevEditing.getNumRows?.() ?? baseRows;
					const prevBaseRows = prev.getRowCount();

					for (let r = prevBaseRows; r < prevTotal; r++) {
						const isAdded = prevEditing.isAddedRow?.(r) === true;
						if (!isAdded) continue;

						Promise.resolve(nextProvider.addRow())
							.then((newIndex: unknown) => {
								const newRowIndex =
									typeof newIndex === "number"
										? (newIndex as number)
										: nextProvider.getRowCount() - 1;
								for (let c = 0; c < colCount; c++) {
									const cell = prevEditing.getCell?.(c, r);
									if (cell !== undefined) {
										try {
											nextProvider.setCell(c, newRowIndex, cell);
										} catch {}
									}
								}
							})
							.catch(() => {});
					}
				} catch {}
			}
		} catch {}

		previousProviderRef.current = dataProvider;
	}, [dataProvider]);

	const getRawCellContent = React.useCallback(
		(col: number, row: number): GridCell => {
			return dataProvider.getCell(col, row);
		},
		[dataProvider],
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
		[visibleColumnIndices, dataProvider],
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
		[visibleColumnIndices, dataProvider],
	);

	return {
		getCellContent,
		onCellEdited,
		getRawCellContent,
		dataProvider,
	};
}
