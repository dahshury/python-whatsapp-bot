import { type GridCell, GridCellKind } from "@glideapps/glide-data-grid";
import type { IColumnDefinition } from "../components/core/interfaces/i-data-source";
import { ColumnTypeRegistry } from "../components/core/services/column-type-registry";

export function getCellValue(
	cell: GridCell,
	colDef?: IColumnDefinition
): unknown {
	if (colDef) {
		const columnType = ColumnTypeRegistry.getInstance().get(colDef.dataType);
		if (columnType) {
			return columnType.getCellValue(cell);
		}
	}

	if (cell.kind === GridCellKind.Text) {
		return (cell as { data?: unknown }).data;
	}
	if (cell.kind === GridCellKind.Number) {
		return (cell as { data?: unknown }).data;
	}
	if (cell.kind === GridCellKind.Boolean) {
		return (cell as { data?: unknown }).data;
	}
	if (cell.kind === GridCellKind.Custom) {
		const customCell = cell as {
			data?: {
				kind?: string;
				value?: unknown;
				date?: unknown;
				scene?: unknown;
			};
		};
		if (customCell.data?.kind === "dropdown-cell") {
			return customCell.data.value;
		}
		if (customCell.data?.kind === "tempus-date-cell") {
			return customCell.data.date;
		}
		if (customCell.data?.kind === "excalidraw-cell") {
			return customCell.data.scene;
		}
		return customCell.data;
	}
	return (cell as { data?: unknown }).data;
}

export function getCellValueForComparison(
	cell: GridCell,
	colDef?: IColumnDefinition
): unknown {
	return getCellValue(cell, colDef);
}

function compareDates(value1: unknown, value2: unknown): boolean {
	if (!(value1 instanceof Date || value2 instanceof Date)) {
		return false;
	}

	const date1 =
		value1 instanceof Date
			? value1
			: new Date(value1 as string | number | Date);
	const date2 =
		value2 instanceof Date
			? value2
			: new Date(value2 as string | number | Date);

	return (
		!(Number.isNaN(date1.getTime()) || Number.isNaN(date2.getTime())) &&
		date1.getTime() === date2.getTime()
	);
}

export function areValuesEqual(value1: unknown, value2: unknown): boolean {
	if (value1 == null && value2 == null) {
		return true;
	}
	if (value1 == null || value2 == null) {
		return false;
	}

	if (value1 instanceof Date && value2 instanceof Date) {
		return value1.getTime() === value2.getTime();
	}
	if (value1 instanceof Date || value2 instanceof Date) {
		return compareDates(value1, value2);
	}

	if (typeof value1 === "number" && typeof value2 === "number") {
		return value1 === value2;
	}

	if (typeof value1 === "string" && typeof value2 === "string") {
		return value1.trim() === value2.trim();
	}

	return value1 === value2;
}
