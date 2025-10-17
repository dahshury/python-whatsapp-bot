import {
	type GridCell,
	GridCellKind,
	type Theme,
} from "@glideapps/glide-data-grid";
import type { IColumnDefinition } from "../components/core/interfaces/i-data-source";
import { ColumnTypeRegistry } from "../components/core/services/column-type-registry";

export function createCellFromDefinition(
	value: unknown,
	colDef: IColumnDefinition,
	theme: Partial<Theme>,
	isDarkTheme: boolean
): GridCell {
	const columnType = ColumnTypeRegistry.getInstance().get(colDef.dataType);
	if (columnType) {
		return columnType.createCell({
			value,
			column: colDef,
			theme,
			isDarkTheme,
		});
	}

	const stringValue = typeof value === "string" ? value : String(value ?? "");
	return {
		kind: GridCellKind.Text,
		data: stringValue,
		displayData: stringValue,
		allowOverlay: true,
	};
}
