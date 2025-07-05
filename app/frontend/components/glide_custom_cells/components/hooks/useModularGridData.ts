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
