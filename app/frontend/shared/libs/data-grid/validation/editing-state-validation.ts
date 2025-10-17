import type { GridCell } from "@glideapps/glide-data-grid";
import { getCellValue } from "@shared/libs/data-grid/utils/value";
import type { IColumnDefinition } from "../components/core/interfaces/i-data-source";
import type { BaseColumnProps } from "../components/core/types";
import { messages } from "../components/utils/i18n";

type ValidationError = { row: number; col: number; message: string };

type CellValidationContext = {
	cell: GridCell;
	colIndex: number;
	rowIndex: number;
	columnsByIndex: Map<number, BaseColumnProps>;
	columnDefinitions: Map<number, IColumnDefinition>;
};

type RowValidationContext = {
	row: Map<number, GridCell>;
	rowIndex: number;
	columnsByIndex: Map<number, BaseColumnProps>;
	columnDefinitions: Map<number, IColumnDefinition>;
	errors: ValidationError[];
};

function validateCell(context: CellValidationContext): ValidationError | null {
	const { cell, colIndex, rowIndex, columnsByIndex, columnDefinitions } =
		context;
	const column = columnsByIndex.get(colIndex);
	const colDef = columnDefinitions.get(colIndex);

	if (!(column && colDef)) {
		return null;
	}

	const cellWithValidation = cell as GridCell & {
		isMissingValue?: boolean;
		validationError?: string | undefined;
	};

	// Check for missing value flag
	if (cellWithValidation.isMissingValue === true) {
		const errorMessage =
			cellWithValidation.validationError ||
			messages.validation.required(column.title || column.name || "Field");
		return { row: rowIndex, col: colIndex, message: errorMessage };
	}

	// Check for required field validation
	const value = getCellValue(cell, colDef);
	if (
		colDef.isRequired &&
		colDef.isEditable !== false &&
		(value === null ||
			value === undefined ||
			value === "" ||
			(typeof value === "string" && value.trim() === ""))
	) {
		return {
			row: rowIndex,
			col: colIndex,
			message: messages.validation.required(
				column.title || column.name || "Field"
			),
		};
	}

	return null;
}

function validateRowCells(context: RowValidationContext): void {
	const { row, rowIndex, columnsByIndex, columnDefinitions, errors } = context;

	for (const [colIndex, cell] of row) {
		const error = validateCell({
			cell,
			colIndex,
			rowIndex,
			columnsByIndex,
			columnDefinitions,
		});
		if (error) {
			errors.push(error);
		}
	}
}

export function validateEditingState(args: {
	editedCells: Map<number, Map<number, GridCell>>;
	addedRows: Map<number, GridCell>[];
	numRows: number;
	columns: BaseColumnProps[];
	columnDefinitions: Map<number, IColumnDefinition>;
}): {
	isValid: boolean;
	errors: ValidationError[];
} {
	const { editedCells, addedRows, numRows, columns, columnDefinitions } = args;
	const errors: ValidationError[] = [];
	const columnsByIndex = new Map<number, BaseColumnProps>();

	// Build column index map
	for (const column of columns) {
		columnsByIndex.set(column.indexNumber, column);
	}

	// Validate edited cells
	for (const [rowIndex, row] of editedCells) {
		if (!row) {
			continue;
		}
		validateRowCells({
			row,
			rowIndex,
			columnsByIndex,
			columnDefinitions,
			errors,
		});
	}

	// Validate added rows
	for (
		let addedRowIndex = 0;
		addedRowIndex < addedRows.length;
		addedRowIndex++
	) {
		const rowIndex = numRows + addedRowIndex;
		const row = addedRows[addedRowIndex];
		if (!row) {
			continue;
		}
		validateRowCells({
			row,
			rowIndex,
			columnsByIndex,
			columnDefinitions,
			errors,
		});
	}

	return { isValid: errors.length === 0, errors };
}
