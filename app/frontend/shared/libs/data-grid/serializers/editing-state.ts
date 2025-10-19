import {
	type GridCell,
	GridCellKind,
	type Theme,
} from "@glideapps/glide-data-grid";
import { getColumnName } from "@shared/libs/data-grid/utils/columns";
import { isMissingValueCell } from "@shared/libs/data-grid/utils/is-missing-value-cell";
import {
	areValuesEqual,
	getCellValue,
} from "@shared/libs/data-grid/utils/value";
import { zEditingState } from "@shared/validation/data-grid/editing-state.schema";
import { safeParseJson } from "@shared/validation/json";
import type { IColumnDefinition } from "../components/core/interfaces/i-data-source";
import { ColumnTypeRegistry } from "../components/core/services/column-type-registry";
import type { BaseColumnProps } from "../components/core/types";
import { notNullOrUndefined } from "../components/utils/general-utils";

type EditedCellsMap = Map<number, Map<number, GridCell>>;

const PHONE_PREFIX_REGEX = /^\+\d{1,4}\s*$/;

type ProcessEditedRowArgs = {
	rowIndex: number;
	row: Map<number, GridCell>;
	columnsByIndex: Map<number, BaseColumnProps>;
	columnDefinitions: Map<number, IColumnDefinition>;
	getOriginalCellValue: (row: number, col: number) => unknown;
	currentState: {
		edited_rows: Record<number, Record<string, unknown>>;
		added_rows: Record<string, unknown>[];
		deleted_rows: number[];
	};
};

type ProcessAddedRowArgs = {
	row: Map<number, GridCell>;
	columnsByIndex: Map<number, BaseColumnProps>;
	columnDefinitions: Map<number, IColumnDefinition>;
	currentState: {
		edited_rows: Record<number, Record<string, unknown>>;
		added_rows: Record<string, unknown>[];
		deleted_rows: number[];
	};
};

type ProcessDeserializedEditedRowArgs = {
	rowIndex: number;
	editedRow: Record<string, unknown>;
	columnsByName: Map<string, BaseColumnProps>;
	columnDefinitions: Map<number, IColumnDefinition>;
	editedCells: EditedCellsMap;
	theme?: Partial<Theme>;
	isDarkTheme?: boolean;
};

type ProcessDeserializedAddedRowArgs = {
	row: Record<string, unknown>;
	columns: BaseColumnProps[];
	columnsByName: Map<string, BaseColumnProps>;
	columnDefinitions: Map<number, IColumnDefinition>;
	theme?: Partial<Theme>;
	isDarkTheme?: boolean;
};

export function serializeEditingState(args: {
	editedCells: EditedCellsMap;
	addedRows: Map<number, GridCell>[];
	deletedRows: number[];
	columns: BaseColumnProps[];
	columnDefinitions: Map<number, IColumnDefinition>;
	getOriginalCellValue: (row: number, col: number) => unknown;
}): string {
	const {
		editedCells,
		addedRows,
		deletedRows,
		columns,
		columnDefinitions,
		getOriginalCellValue,
	} = args;

	const columnsByIndex = new Map<number, BaseColumnProps>();
	for (const column of columns) {
		columnsByIndex.set(column.indexNumber, column);
	}

	const currentState = {
		edited_rows: {} as Record<number, Record<string, unknown>>,
		added_rows: [] as Record<string, unknown>[],
		deleted_rows: [] as number[],
	};

	for (const [rowIndex, rowData] of editedCells) {
		processEditedRow({
			rowIndex,
			row: rowData,
			columnsByIndex,
			columnDefinitions,
			getOriginalCellValue,
			currentState,
		});
	}

	for (const addedRow of addedRows) {
		processAddedRow({
			row: addedRow,
			columnsByIndex,
			columnDefinitions,
			currentState,
		});
	}

	currentState.deleted_rows = deletedRows;

	const result = JSON.stringify(currentState, (_k, v) =>
		v === undefined ? null : v
	);
	// biome-ignore lint/suspicious/noConsole: DEBUG
	globalThis.console?.log?.(
		"[EditingState] serializeEditingState",
		currentState
	);
	return result;
}

function processEditedRow(args: ProcessEditedRowArgs): void {
	const {
		rowIndex,
		row,
		columnsByIndex,
		columnDefinitions,
		getOriginalCellValue,
		currentState,
	} = args;

	const editedRow: Record<string, unknown> = {};
	const mutableHasOriginalData: MutableBoolean = { value: false };

	for (const [colIndex, cell] of row) {
		const column = columnsByIndex.get(colIndex);
		if (!column) {
			continue;
		}

		const colDef = columnDefinitions.get(column.indexNumber);
		const updateArgs = {
			cell,
			column,
			rowIndex,
			colIndex,
			getOriginalCellValue,
			editedRow,
			mutableHasOriginalData,
		} as const;

		updateEditedRowWithCell(colDef ? { ...updateArgs, colDef } : updateArgs);
	}

	if (Object.keys(editedRow).length > 0) {
		// biome-ignore lint/suspicious/noConsole: DEBUG
		globalThis.console?.log?.(
			`[EditingState] Saving row ${rowIndex}: hasOriginalData=`,
			mutableHasOriginalData.value,
			"editedRow=",
			editedRow
		);

		saveEditedRow({
			editedRow,
			hasOriginalData: mutableHasOriginalData.value,
			rowIndex,
			row,
			columnsByIndex,
			columnDefinitions,
			getOriginalCellValue,
			currentState,
		});
	}
}

type MutableBoolean = {
	value: boolean;
};

function updateEditedRowWithCell(args: {
	cell: GridCell;
	colDef?: IColumnDefinition;
	column: BaseColumnProps;
	rowIndex: number;
	colIndex: number;
	getOriginalCellValue: (row: number, col: number) => unknown;
	editedRow: Record<string, unknown>;
	mutableHasOriginalData: MutableBoolean;
}): void {
	const {
		cell,
		colDef,
		column,
		rowIndex,
		colIndex,
		getOriginalCellValue,
		editedRow,
		mutableHasOriginalData,
	} = args;

	const cellValue = getCellValue(cell, colDef);
	const originalValue = getOriginalCellValue(rowIndex, colIndex);

	const isPhonePrefix =
		typeof originalValue === "string" &&
		PHONE_PREFIX_REGEX.test(originalValue.trim());

	// biome-ignore lint/suspicious/noConsole: DEBUG
	globalThis.console?.log?.(
		`[EditingState] Checking cell (${rowIndex},${colIndex}):`,
		"cellValue=",
		cellValue,
		"originalValue=",
		originalValue,
		"isPhonePrefix=",
		isPhonePrefix,
		"hasOriginal=",
		originalValue != null && originalValue !== "" && !isPhonePrefix
	);

	if (originalValue != null && originalValue !== "" && !isPhonePrefix) {
		mutableHasOriginalData.value = true;
	}

	const isDifferent = !areValuesEqual(cellValue, originalValue);

	if (isDifferent && notNullOrUndefined(cellValue) && cellValue !== "") {
		editedRow[getColumnName(column)] = cellValue;
	}
}

function saveEditedRow(args: {
	editedRow: Record<string, unknown>;
	hasOriginalData: boolean;
	rowIndex: number;
	row: Map<number, GridCell>;
	columnsByIndex: Map<number, BaseColumnProps>;
	columnDefinitions: Map<number, IColumnDefinition>;
	getOriginalCellValue: (row: number, col: number) => unknown;
	currentState: {
		edited_rows: Record<number, Record<string, unknown>>;
		added_rows: Record<string, unknown>[];
		deleted_rows: number[];
	};
}): void {
	if (args.hasOriginalData) {
		args.currentState.edited_rows[args.rowIndex] = args.editedRow;
	} else {
		const completeRow: Record<string, unknown> = {};
		for (const [colIndex, column] of args.columnsByIndex) {
			const currentCell = args.row.get(colIndex);
			let cellValue: unknown;

			if (currentCell) {
				const colDef2 = args.columnDefinitions.get(column.indexNumber);
				cellValue = getCellValue(currentCell, colDef2);
			} else {
				cellValue = args.getOriginalCellValue(args.rowIndex, colIndex);
			}

			if (notNullOrUndefined(cellValue)) {
				completeRow[column.id || column.name || `col_${colIndex}`] = cellValue;
			}
		}
		args.currentState.added_rows.push(completeRow);
	}
}

function processAddedRow(args: ProcessAddedRowArgs): void {
	const { row, columnsByIndex, columnDefinitions, currentState } = args;

	const addedRow: Record<string, unknown> = {};
	let isIncomplete = false;

	for (const [colIndex, cell] of row) {
		const column = columnsByIndex.get(colIndex);
		if (!column) {
			continue;
		}

		const colDef = columnDefinitions.get(colIndex);
		const cellValue = getCellValue(cell, colDef);
		const isMissing = isMissingValueCell(cell);

		if (colDef?.isRequired && colDef?.isEditable !== false && isMissing) {
			isIncomplete = true;
		}

		if (notNullOrUndefined(cellValue) && cellValue !== "") {
			addedRow[getColumnName(column)] = cellValue;
		}
	}

	if (!isIncomplete) {
		currentState.added_rows.push(addedRow);
	}
}

// Helper to conditionally include theme options
function buildThemeOptions(
	theme: Partial<Theme> | undefined,
	isDarkTheme: boolean | undefined
): { theme?: Partial<Theme>; isDarkTheme?: boolean } {
	const opts: { theme?: Partial<Theme>; isDarkTheme?: boolean } = {};
	if (theme !== undefined) {
		opts.theme = theme;
	}
	if (isDarkTheme !== undefined) {
		opts.isDarkTheme = isDarkTheme;
	}
	return opts;
}

export function deserializeEditingState(args: {
	json: string;
	columns: BaseColumnProps[];
	columnDefinitions: Map<number, IColumnDefinition>;
	theme?: Partial<Theme>;
	isDarkTheme?: boolean | undefined;
}): {
	editedCells: EditedCellsMap;
	addedRows: Map<number, GridCell>[];
	deletedRows: number[];
} {
	const { json, columns, columnDefinitions, theme, isDarkTheme } = args;
	const parsed = safeParseJson(zEditingState, json);
	const editingState = parsed.success
		? parsed.data
		: { edited_rows: {}, added_rows: [], deleted_rows: [] };
	// biome-ignore lint/suspicious/noConsole: DEBUG
	globalThis.console?.log?.(
		"[EditingState] deserializeEditingState",
		editingState
	);

	const columnsByName = new Map<string, BaseColumnProps>();
	for (const column of columns) {
		columnsByName.set(getColumnName(column), column);
	}

	const editedCells: EditedCellsMap = new Map();
	const themeOpts = buildThemeOptions(theme, isDarkTheme);

	for (const key of Object.keys(editingState.edited_rows || {})) {
		const rowIndex = Number(key);
		const editedRow = editingState.edited_rows[key];
		if (editedRow === undefined) continue;

		const editedRowArgs = {
			rowIndex,
			editedRow,
			columnsByName,
			columnDefinitions,
			editedCells,
		} as const;

		processDeserializedEditedRow(
			Object.keys(themeOpts).length > 0
				? {
						...editedRowArgs,
						...themeOpts,
					}
				: editedRowArgs
		);
	}

	const addedRows: Map<number, GridCell>[] = [];
	for (const row of editingState.added_rows || []) {
		const addedRowArgs = {
			row: row as Record<string, unknown>,
			columns,
			columnsByName,
			columnDefinitions,
		} as const;

		const addedRow = processDeserializedAddedRow(
			Object.keys(themeOpts).length > 0
				? {
						...addedRowArgs,
						...themeOpts,
					}
				: addedRowArgs
		);
		addedRows.push(addedRow);
	}

	const deletedRows: number[] = editingState.deleted_rows || [];

	return { editedCells, addedRows, deletedRows };
}

function processDeserializedEditedRow(
	args: ProcessDeserializedEditedRowArgs
): void {
	const {
		rowIndex,
		editedRow,
		columnsByName,
		columnDefinitions,
		editedCells,
		theme,
		isDarkTheme,
	} = args;

	for (const colName of Object.keys(editedRow)) {
		const cellValue = editedRow[colName];
		const column = columnsByName.get(colName);
		if (!column) {
			continue;
		}

		const colDef = columnDefinitions.get(column.indexNumber);
		if (!colDef) {
			continue;
		}

		const cell = createCellFromDefinition(
			cellValue,
			colDef,
			theme,
			!!isDarkTheme
		);
		if (cell) {
			if (!editedCells.has(rowIndex)) {
				editedCells.set(rowIndex, new Map());
			}
			editedCells.get(rowIndex)?.set(column.indexNumber, cell);
		}
	}
}

function processDeserializedAddedRow(
	args: ProcessDeserializedAddedRowArgs
): Map<number, GridCell> {
	const { row, columns, columnsByName, columnDefinitions, theme, isDarkTheme } =
		args;

	const addedRow: Map<number, GridCell> = new Map();

	for (const column of columns) {
		const colDef = columnDefinitions.get(column.indexNumber);
		if (colDef) {
			const cell = createCellFromDefinition(null, colDef, theme, !!isDarkTheme);
			if (cell) {
				addedRow.set(column.indexNumber, cell);
			}
		}
	}

	for (const colName of Object.keys(row)) {
		const column = columnsByName.get(colName);
		if (!column) {
			continue;
		}

		const colDef = columnDefinitions.get(column.indexNumber);
		if (!colDef) {
			continue;
		}

		const cell = createCellFromDefinition(
			row[colName],
			colDef,
			theme,
			!!isDarkTheme
		);
		if (cell) {
			addedRow.set(column.indexNumber, cell);
		}
	}

	return addedRow;
}

function createCellFromDefinition(
	value: unknown,
	colDef: IColumnDefinition,
	theme?: Partial<Theme>,
	isDarkTheme?: boolean
): GridCell | null {
	const columnType = ColumnTypeRegistry.getInstance().get(colDef.dataType);
	if (columnType) {
		return columnType.createCell({
			value,
			column: colDef,
			theme: theme || {},
			isDarkTheme: !!isDarkTheme,
		});
	}

	const stringValue = typeof value === "string" ? value : String(value || "");
	return {
		kind: GridCellKind.Text,
		data: stringValue,
		displayData: stringValue,
		allowOverlay: true,
	};
}
