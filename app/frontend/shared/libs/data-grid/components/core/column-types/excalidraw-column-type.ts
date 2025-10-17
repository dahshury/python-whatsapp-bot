import {
	type EditableGridCell,
	type GridCell,
	GridCellKind,
} from "@glideapps/glide-data-grid";
import type {
	ExcalidrawCell,
	ExcalidrawCellProps,
} from "../../models/excalidraw-cell-types";
import type {
	CreateCellOptions,
	IColumnType,
} from "../interfaces/i-column-type";
import {
	COLUMN_DATA_TYPE,
	type IColumnDefinition,
	type IColumnFormatting,
} from "../interfaces/i-data-source";

export class ExcalidrawColumnType implements IColumnType {
	id = "excalidraw";
	dataType = COLUMN_DATA_TYPE.EXCALIDRAW;

	createCell(options: CreateCellOptions): GridCell {
		const { value, column: _column } = options;
		const scene = this.parseValue(value, _column) as
			| ExcalidrawCellProps["scene"]
			| undefined;
		const cell: ExcalidrawCell = {
			kind: GridCellKind.Custom,
			data: {
				kind: "excalidraw-cell",
				scene,
				display: "",
			},
			copyData: "",
			allowOverlay: true,
		} as ExcalidrawCell;
		return cell as unknown as GridCell;
	}

	getCellValue(cell: GridCell): unknown {
		if (
			cell.kind === GridCellKind.Custom &&
			(cell as { data?: { kind?: string; scene?: unknown } }).data?.kind ===
				"excalidraw-cell"
		) {
			return (cell as { data?: { kind?: string; scene?: unknown } }).data
				?.scene;
		}
		return;
	}

	validateValue(
		_value: unknown,
		_column: IColumnDefinition
	): { isValid: boolean; error?: string } {
		return { isValid: true };
	}

	formatValue(_value: unknown, _formatting?: IColumnFormatting): string {
		return "";
	}

	parseValue(input: unknown, _column: IColumnDefinition): unknown {
		if (!input) {
			return;
		}
		if (typeof input === "object") {
			return input as ExcalidrawCellProps["scene"];
		}
		return;
	}

	getDefaultValue(_column: IColumnDefinition): unknown {
		return;
	}

	canEdit(_column: IColumnDefinition): boolean {
		return true;
	}

	createEditableCell(
		cell: GridCell,
		_column: IColumnDefinition
	): EditableGridCell {
		return cell as EditableGridCell;
	}
}
